#!/usr/bin/env node

/**
 * Servidor Web para Açucaradas Encomendas
 * Versão web funcional do aplicativo de delivery de doces
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/css', express.static(path.join(__dirname, 'website/css')));
app.use('/js', express.static(path.join(__dirname, 'website/js')));
app.use('/images', express.static(path.join(__dirname, 'website/images')));

// Dados mock para demonstração
const mockData = {
  produtos: [
    {
      id: 1,
      nome: "Bolo de Chocolate Gourmet",
      preco: 45.90,
      descricao: "Delicioso bolo de chocolate com cobertura especial",
      imagem: "/assets/logo-chef.svg",
      categoria: "bolos",
      disponivel: true,
      tempo_preparo: "2-3 horas"
    },
    {
      id: 2,
      nome: "Brigadeiros Artesanais",
      preco: 2.50,
      descricao: "Brigadeiros feitos com chocolate belga (unidade)",
      imagem: "/assets/logo-chef.svg",
      categoria: "doces",
      disponivel: true,
      tempo_preparo: "30 minutos"
    },
    {
      id: 3,
      nome: "Torta de Morango",
      preco: 38.00,
      descricao: "Torta fresca com morangos selecionados",
      imagem: "/assets/logo-chef.svg",
      categoria: "tortas",
      disponivel: true,
      tempo_preparo: "1-2 horas"
    },
    {
      id: 4,
      nome: "Cupcakes Decorados",
      preco: 8.90,
      descricao: "Cupcakes personalizados com decoração especial",
      imagem: "/assets/logo-chef.svg",
      categoria: "cupcakes",
      disponivel: true,
      tempo_preparo: "45 minutos"
    }
  ],
  pedidos: [],
  usuarios: []
};

// Rotas da API
app.get('/api/produtos', (req, res) => {
  const { categoria } = req.query;
  let produtos = mockData.produtos;
  
  if (categoria) {
    produtos = produtos.filter(p => p.categoria === categoria);
  }
  
  res.json({
    success: true,
    data: produtos,
    total: produtos.length
  });
});

app.get('/api/produtos/:id', (req, res) => {
  const produto = mockData.produtos.find(p => p.id === parseInt(req.params.id));
  
  if (!produto) {
    return res.status(404).json({
      success: false,
      message: 'Produto não encontrado'
    });
  }
  
  res.json({
    success: true,
    data: produto
  });
});

app.post('/api/pedidos', (req, res) => {
  const { produtos, cliente, endereco, pagamento } = req.body;
  
  const novoPedido = {
    id: mockData.pedidos.length + 1,
    produtos,
    cliente,
    endereco,
    pagamento,
    status: 'pendente',
    data_criacao: new Date().toISOString(),
    total: produtos.reduce((sum, item) => sum + (item.preco * item.quantidade), 0)
  };
  
  mockData.pedidos.push(novoPedido);
  
  res.json({
    success: true,
    data: novoPedido,
    message: 'Pedido criado com sucesso!'
  });
});

app.get('/api/pedidos', (req, res) => {
  res.json({
    success: true,
    data: mockData.pedidos,
    total: mockData.pedidos.length
  });
});

// Rota principal - servir a aplicação web
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-app.html'));
});

// Rota para o website institucional
app.get('/website', (req, res) => {
  res.sendFile(path.join(__dirname, 'website/index.html'));
});

// Rota de status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    projeto: 'Açucaradas Encomendas - Web App',
    endpoints: {
      'GET /': 'Aplicação Web Principal',
      'GET /website': 'Website Institucional',
      'GET /api/produtos': 'Lista de produtos',
      'GET /api/produtos/:id': 'Detalhes do produto',
      'POST /api/pedidos': 'Criar novo pedido',
      'GET /api/pedidos': 'Lista de pedidos'
    }
  });
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor'
  });
});

// Middleware 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Iniciar servidor
function startServer() {
  const server = app.listen(PORT, () => {
    console.log('🚀 Açucaradas Encomendas - Servidor Web');
    console.log('📱 Aplicativo de delivery de doces artesanais');
    console.log('');
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
    console.log(`🌐 Aplicação Web: http://localhost:${PORT}`);
    console.log(`📄 Website: http://localhost:${PORT}/website`);
    console.log(`📊 Status: http://localhost:${PORT}/status`);
    console.log(`🔌 API: http://localhost:${PORT}/api/produtos`);
    console.log('');
    console.log('⚡ Node.js:', process.version);
    console.log('📅 Iniciado em:', new Date().toLocaleString('pt-BR'));
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`❌ Porta ${PORT} já está em uso. Tentando porta ${PORT + 1}...`);
      PORT++;
      startServer();
    } else {
      console.error('❌ Erro ao iniciar servidor:', err);
    }
  });
}

startServer();

// Capturar sinais de interrupção
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando servidor web...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Encerrando servidor web...');
  process.exit(0);
});