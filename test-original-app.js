const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Rota principal que serve uma página HTML simples para testar o aplicativo
app.get('/', (req, res) => {
  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Açucaradas Encomendas - Teste Original</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
        }
        h1 {
            margin: 0;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
            margin-top: 10px;
        }
        .status {
            background: rgba(76, 175, 80, 0.2);
            border: 1px solid rgba(76, 175, 80, 0.5);
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .info-card {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .info-card h3 {
            margin: 0 0 10px 0;
            color: #FFD700;
        }
        .features {
            list-style: none;
            padding: 0;
        }
        .features li {
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .features li:last-child {
            border-bottom: none;
        }
        .tech-stack {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }
        .tech-tag {
            background: rgba(255, 255, 255, 0.2);
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .error-section {
            background: rgba(244, 67, 54, 0.2);
            border: 1px solid rgba(244, 67, 54, 0.5);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .error-title {
            color: #FF6B6B;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .solution {
            background: rgba(33, 150, 243, 0.2);
            border: 1px solid rgba(33, 150, 243, 0.5);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .solution-title {
            color: #64B5F6;
            font-weight: bold;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🧁</div>
            <h1>Açucaradas Encomendas</h1>
            <div class="subtitle">Aplicativo Original - Diagnóstico de Problemas</div>
        </div>

        <div class="status">
            ✅ Servidor de Teste Funcionando na Porta ${PORT}
        </div>

        <div class="error-section">
            <div class="error-title">🐛 Problema Identificado:</div>
            <p><strong>Metro Bundler Incompatibilidade:</strong> Cannot find module 'metro/src/lib/TerminalReporter'</p>
            <p>O Expo CLI está tentando acessar um módulo do Metro que não existe ou foi movido em versões mais recentes.</p>
        </div>

        <div class="solution">
            <div class="solution-title">🔧 Soluções Implementadas:</div>
            <ul>
                <li>✅ Configuração do package.json para Expo Router</li>
                <li>✅ Configuração do app.json com plugins</li>
                <li>✅ Configuração do babel.config.js</li>
                <li>✅ Adição da dependência async-storage</li>
                <li>⏳ Teste de versões específicas do Expo CLI</li>
            </ul>
        </div>

        <div class="info-grid">
            <div class="info-card">
                <h3>📱 Estrutura do App</h3>
                <ul class="features">
                    <li>🏠 Tela Inicial (index.tsx)</li>
                    <li>📦 Lista de Produtos</li>
                    <li>🛒 Sistema de Pedidos</li>
                    <li>⭐ Sistema de Avaliações</li>
                    <li>🔍 Detalhes de Produtos</li>
                </ul>
            </div>

            <div class="info-card">
                <h3>🛠️ Tecnologias</h3>
                <div class="tech-stack">
                    <span class="tech-tag">Expo Router</span>
                    <span class="tech-tag">React Native</span>
                    <span class="tech-tag">TypeScript</span>
                    <span class="tech-tag">Firebase</span>
                    <span class="tech-tag">React Native Paper</span>
                </div>
            </div>

            <div class="info-card">
                <h3>🔧 Componentes Principais</h3>
                <ul class="features">
                    <li>OptimizedStateProvider</li>
                    <li>ErrorBoundary</li>
                    <li>Button Component</li>
                    <li>Global State Management</li>
                </ul>
            </div>

            <div class="info-card">
                <h3>📊 Status do Sistema</h3>
                <ul class="features">
                    <li>Node.js: ${process.version}</li>
                    <li>Servidor: Express.js</li>
                    <li>Porta: ${PORT}</li>
                    <li>Status: ✅ Funcionando</li>
                </ul>
            </div>
        </div>

        <div class="solution">
            <div class="solution-title">🚀 Próximos Passos:</div>
            <ol>
                <li><strong>Downgrade do Expo SDK:</strong> Considerar usar Expo SDK 50 para melhor compatibilidade</li>
                <li><strong>Metro Config:</strong> Atualizar configuração do Metro Bundler</li>
                <li><strong>Dependências:</strong> Verificar e atualizar todas as dependências</li>
                <li><strong>Teste Alternativo:</strong> Usar Webpack ou Vite como bundler alternativo</li>
            </ol>
        </div>
    </div>

    <script>
        console.log('🧁 Açucaradas Encomendas - Servidor de Teste Iniciado');
        console.log('📊 Diagnóstico de problemas do aplicativo original');
        console.log('🔧 Problema principal: Incompatibilidade do Metro Bundler');
    </script>
</body>
</html>
  `;
  
  res.send(htmlContent);
});

// Rota para informações do sistema
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    app: 'Açucaradas Encomendas - Teste Original',
    port: PORT,
    node_version: process.version,
    timestamp: new Date().toISOString(),
    problem: 'Metro Bundler incompatibility',
    solution: 'Testing alternative approaches'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🧁 Açucaradas Encomendas - Servidor de Teste`);
  console.log(`🌐 Rodando em: http://localhost:${PORT}`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);
  console.log(`🔧 Diagnóstico: Problema com Metro Bundler identificado`);
  console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
});