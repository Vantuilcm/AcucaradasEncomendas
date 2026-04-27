/**
 * Script para integrar o Dashboard de Segurança com o servidor principal
 * Este script configura o dashboard de segurança para ser servido
 * junto com a aplicação principal, sem necessidade de um servidor separado.
 */

const path = require('path');
const fs = require('fs');

// Verificar se o arquivo server.js existe
const serverPath = path.join(__dirname, '../server.js');
if (!fs.existsSync(serverPath)) {
  console.error('Erro: Arquivo server.js não encontrado. Este script deve ser executado na raiz do projeto.');
  process.exit(1);
}

// Ler o conteúdo do arquivo server.js
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Verificar se o dashboard já está integrado
if (serverContent.includes('security-dashboard')) {
  console.log('O Dashboard de Segurança já está integrado ao servidor principal.');
  process.exit(0);
}

// Identificar o ponto de integração
let integrationPoint = serverContent.indexOf('app.listen(');
if (integrationPoint === -1) {
  console.error('Erro: Não foi possível encontrar o ponto de integração no arquivo server.js.');
  process.exit(1);
}

// Encontrar o ponto para importar o módulo
let importPoint = serverContent.lastIndexOf('const');
if (importPoint === -1) {
  importPoint = 0;
}

// Adicionar a importação do módulo do dashboard
const importStatement = "const securityDashboard = require('./src/middleware/security-dashboard');\n";
serverContent = serverContent.slice(0, importPoint) + importStatement + serverContent.slice(importPoint);

// Encontrar onde o servidor HTTP é criado
let serverCreationPoint = serverContent.indexOf('app.listen(');
if (serverCreationPoint === -1) {
  console.error('Erro: Não foi possível encontrar a criação do servidor HTTP.');
  process.exit(1);
}

// Modificar a criação do servidor para capturar a instância
const serverCreationCode = `
// Criar servidor HTTP explicitamente para integração com o dashboard de segurança
const http = require('http');
const server = http.createServer(app);

// Inicializar o dashboard de segurança
securityDashboard.initSecurityDashboard(app, server, {
  route: '/security-dashboard',
  requireAuth: true,
  // Personalizar o middleware de autenticação conforme necessário
  authMiddleware: (req, res, next) => {
    // Verificar se o usuário está autenticado e tem permissões de administrador
    if (!req.session || !req.session.user || !req.session.user.isAdmin) {
      return res.status(403).send('Acesso não autorizado. Este dashboard requer privilégios de administrador.');
    }
    next();
  }
});

// Iniciar o servidor na porta especificada
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Dashboard de segurança disponível em http://localhost:${PORT}/security-dashboard`);
});
`;

// Substituir a chamada app.listen() pelo novo código
serverContent = serverContent.replace(/app\.listen\([^)]+\)[^;]*;/, serverCreationCode);

// Salvar as alterações no arquivo server.js
fs.writeFileSync(serverPath, serverContent, 'utf8');

console.log('Dashboard de Segurança integrado com sucesso ao servidor principal!');
console.log('Para acessar o dashboard, inicie o servidor e navegue para /security-dashboard');