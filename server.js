const http = require('http');
const fs = require('fs');
const path = require('path');

// Importar utilitários de segurança
const { applySecurityHeadersToServer } = require('./src/utils/security-headers');

const PORT = process.env.PORT || 3000;

// Mapeamento de tipos MIME
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Nota: Removemos esta função pois agora usamos o módulo security-headers.js

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Aplicar headers de segurança
  applySecurityHeadersToServer(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './public/index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Se arquivo não encontrado, serve o index.html (SPA routing)
        fs.readFile('./public/index.html', (error, content) => {
          if (error) {
            res.writeHead(500);
            res.end('Erro interno do servidor');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Erro interno do servidor: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log('📱 Açucaradas Encomendas - Aplicativo de Doces');
  console.log('⏹️  Pressione Ctrl+C para parar o servidor');
  console.log('🔒 Headers de segurança implementados');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Parando servidor...');
  server.close(() => {
    console.log('✅ Servidor parado com sucesso');
    process.exit(0);
  });
});