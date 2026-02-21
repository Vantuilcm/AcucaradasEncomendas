const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8082;

// HTML básico para testar o aplicativo
const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Açucaradas Encomendas - Teste</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #FFF8F0;
            text-align: center;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        h1 {
            color: #8B4513;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #D2691E;
            font-size: 1.2em;
            margin-bottom: 30px;
            font-style: italic;
        }
        .status {
            background-color: #F0F8FF;
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #D2691E;
            margin: 20px 0;
        }
        .success {
            color: #2E8B57;
            font-weight: bold;
        }
        .button {
            background-color: #8B4513;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px;
            text-decoration: none;
            display: inline-block;
        }
        .button:hover {
            background-color: #A0522D;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🍰 Açucaradas Encomendas</h1>
        <p class="subtitle">Aplicativo de Delivery de Doces</p>
        
        <div class="status">
            <p class="success">✅ Servidor Web funcionando!</p>
            <p class="success">🚀 Aplicativo carregado com sucesso</p>
            <p class="success">📱 Pronto para desenvolvimento</p>
        </div>
        
        <div>
            <a href="#" class="button" onclick="alert('Funcionalidade em desenvolvimento!')">Ver Pedidos</a>
            <a href="#" class="button" onclick="alert('Funcionalidade em desenvolvimento!')">Nova Encomenda</a>
        </div>
        
        <div style="margin-top: 30px; font-size: 14px; color: #666;">
            <p>🔧 Modo: Desenvolvimento</p>
            <p>🌐 Porta: ${PORT}</p>
            <p>⚡ Status: Online</p>
        </div>
    </div>
</body>
</html>
`;

const server = http.createServer((req, res) => {
    console.log(`📥 Requisição recebida: ${req.method} ${req.url}`);
    
    // Configurar headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Servir o HTML
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado com sucesso!`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log(`📁 Diretório: ${__dirname}`);
    console.log(`⚡ Node.js: ${process.version}`);
    console.log(`🕒 Horário: ${new Date().toLocaleString('pt-BR')}`);
});

server.on('error', (error) => {
    console.error(`❌ Erro no servidor:`, error);
    if (error.code === 'EADDRINUSE') {
        console.log(`⚠️ Porta ${PORT} já está em uso. Tente uma porta diferente.`);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado com sucesso!');
        process.exit(0);
    });
});