'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crc32Table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crc32Table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}
function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}
/** Minimal ZIP (store). entries: [name, data] or [name, data, { unixMode }]. */
function writeZip(filePath, entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = entry[0];
    const data = Buffer.isBuffer(entry[1]) ? entry[1] : Buffer.from(entry[1], 'utf8');
    const opts = entry[2] || {};
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const madeBy = opts.unixMode ? 0x0314 : 20; // Unix when mode set
    const extAttr = opts.unixMode ? ((opts.unixMode & 0xffff) << 16) >>> 0 : 0;
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
      data,
    ]);
    const central = Buffer.concat([
      u32(0x02014b50),
      u16(madeBy),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(extAttr),
      u32(offset),
      nameBuf,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralDir = Buffer.concat(centrals);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);
  fs.writeFileSync(filePath, Buffer.concat([...locals, centralDir, end]));
}

function plist(pid, bid, aid, sid, buck, key) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PROJECT_ID</key>
  <string>${pid}</string>
  <key>BUNDLE_ID</key>
  <string>${bid}</string>
  <key>GOOGLE_APP_ID</key>
  <string>${aid}</string>
  <key>GCM_SENDER_ID</key>
  <string>${sid}</string>
  <key>STORAGE_BUCKET</key>
  <string>${buck}</string>
  <key>API_KEY</key>
  <string>${key}</string>
</dict>
</plist>
`;
}

const fix = __dirname;
function packIpa(dir, files) {
  fs.mkdirSync(dir, { recursive: true });
  const entries = Object.entries(files).map(([n, c]) => [n, Buffer.from(c, 'utf8')]);
  writeZip(path.join(dir, 'test.ipa'), entries);
}

packIpa(path.join(fix, 'valid-sandbox'), {
  'Payload/AucaradasEncomendas.app/GoogleService-Info.plist': plist(
    'acucaradas-encomendas-sandbox',
    'com.acucaradas.encomendas',
    '1:sandbox:app',
    '111',
    'acucaradas-encomendas-sandbox.appspot.com',
    'AIzaSySandboxTestKey001'
  ),
  'Payload/AucaradasEncomendas.app/Info.plist': '<plist></plist>\n',
});
packIpa(path.join(fix, 'production-firebase'), {
  'Payload/AucaradasEncomendas.app/GoogleService-Info.plist': plist(
    'acucaradas-encomendas',
    'com.acucaradas.encomendas',
    '1:prod:app',
    '222',
    'acucaradas-encomendas.appspot.com',
    'AIzaSyProductionKey0001'
  ),
  'Payload/AucaradasEncomendas.app/Info.plist': '<plist></plist>\n',
});
packIpa(path.join(fix, 'missing-plist'), {
  'Payload/AucaradasEncomendas.app/Info.plist': '<plist></plist>\n',
});
packIpa(path.join(fix, 'corrupt-plist'), {
  'Payload/AucaradasEncomendas.app/GoogleService-Info.plist': '<<<NOT_PLIST>>>\n',
  'Payload/AucaradasEncomendas.app/Info.plist': '<plist></plist>\n',
});
packIpa(path.join(fix, 'wrong-bundle'), {
  'Payload/AucaradasEncomendas.app/GoogleService-Info.plist': plist(
    'acucaradas-encomendas-sandbox',
    'com.other.app',
    '1:sandbox:app',
    '111',
    'acucaradas-encomendas-sandbox.appspot.com',
    'AIzaSySandboxTestKey001'
  ),
  'Payload/AucaradasEncomendas.app/Info.plist': '<plist></plist>\n',
});
packIpa(path.join(fix, 'multi-app'), {
  'Payload/AucaradasEncomendas.app/GoogleService-Info.plist': plist(
    'acucaradas-encomendas-sandbox',
    'com.acucaradas.encomendas',
    '1:sandbox:app',
    '111',
    'acucaradas-encomendas-sandbox.appspot.com',
    'AIzaSySandboxTestKey001'
  ),
  'Payload/AucaradasEncomendas.app/Info.plist': '<plist></plist>\n',
  'Payload/ExtraApp2.app/GoogleService-Info.plist': plist(
    'acucaradas-encomendas-sandbox',
    'com.acucaradas.encomendas',
    '1:sandbox:app',
    '111',
    'acucaradas-encomendas-sandbox.appspot.com',
    'AIzaSySandboxTestKey001'
  ),
  'Payload/ExtraApp2.app/Info.plist': '<plist></plist>\n',
});
fs.mkdirSync(path.join(fix, 'empty-ipa'), { recursive: true });
fs.writeFileSync(path.join(fix, 'empty-ipa', 'test.ipa'), Buffer.alloc(0));
fs.mkdirSync(path.join(fix, 'corrupt-zip'), { recursive: true });
fs.writeFileSync(path.join(fix, 'corrupt-zip', 'test.ipa'), 'NOT_A_ZIP');
fs.writeFileSync(
  path.join(fix, 'workspace-GoogleService-Info.plist'),
  plist(
    'acucaradas-encomendas',
    'com.acucaradas.encomendas',
    '1:prod:app',
    '222',
    'acucaradas-encomendas.appspot.com',
    'AIzaSyProductionKey0001'
  )
);

// R90 / R89-D01: unsafe ZIP member path fixtures (must reject pre-extract)
const sandboxPlist = plist(
  'acucaradas-encomendas-sandbox',
  'com.acucaradas.encomendas',
  '1:sandbox:app',
  '111',
  'acucaradas-encomendas-sandbox.appspot.com',
  'AIzaSySandboxTestKey001'
);
const payloadBenign = {
  'Payload/AucaradasEncomendas.app/GoogleService-Info.plist': sandboxPlist,
  'Payload/AucaradasEncomendas.app/Info.plist': '<plist></plist>\n',
};

packIpa(path.join(fix, 'zip-abs-path'), {
  ...payloadBenign,
  '/tmp/ae-r90-zipslip-abs-should-not-exist': 'ABS_ESCAPE\n',
});
// Would land in /tmp if unzip ran under mktemp -d /tmp/ae-ipa-attest.XXXXXX
packIpa(path.join(fix, 'zip-parent-dotdot'), {
  ...payloadBenign,
  'Payload/../../ae-r90-zipslip-dotdot-should-not-exist': 'DOTDOT_ESCAPE\n',
});
packIpa(path.join(fix, 'zip-nested-dotdot'), {
  ...payloadBenign,
  'Payload/foo/../../../ae-r90-zipslip-nested-should-not-exist': 'NESTED_ESCAPE\n',
});
{
  const dir = path.join(fix, 'zip-backslash');
  fs.mkdirSync(dir, { recursive: true });
  writeZip(path.join(dir, 'test.ipa'), [
    ['Payload/AucaradasEncomendas.app/GoogleService-Info.plist', Buffer.from(sandboxPlist, 'utf8')],
    ['Payload/AucaradasEncomendas.app/Info.plist', Buffer.from('<plist></plist>\n', 'utf8')],
    ['Payload\\evil.txt', Buffer.from('BACKSLASH\n', 'utf8')],
  ]);
}
{
  const dir = path.join(fix, 'zip-symlink');
  fs.mkdirSync(dir, { recursive: true });
  // Unix symlink member (S_IFLNK | 0777) — zipinfo permission column starts with 'l'
  writeZip(path.join(dir, 'test.ipa'), [
    ['Payload/AucaradasEncomendas.app/GoogleService-Info.plist', Buffer.from(sandboxPlist, 'utf8')],
    ['Payload/AucaradasEncomendas.app/Info.plist', Buffer.from('<plist></plist>\n', 'utf8')],
    ['Payload/link-escape', Buffer.from('/tmp/ae-r90-zipslip-symlink-target', 'utf8'), { unixMode: 0o120777 }],
  ]);
}

console.log('FIXTURES_OK', fix);
// silence unused
void zlib;
