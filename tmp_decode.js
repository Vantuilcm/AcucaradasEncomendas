const fs = require('fs');
const b = fs.readFileSync('public_config.json');
console.log('bytes', b.slice(0,8).toJSON().data.map(x => x.toString(16).padStart(2,'0')).join(' '));
['utf8','utf16le','utf16be'].forEach(enc => {
  const s = b.toString(enc);
  console.log(enc, JSON.stringify(s.slice(0,40)));
  try {
    const clean = s.replace(/^\uFEFF/, '');
    const o = JSON.parse(clean);
    console.log(enc, 'ok', o.ios.buildNumber);
  } catch (e) {
    console.log(enc, 'err', e.message);
  }
});
