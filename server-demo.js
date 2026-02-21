const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

let PORT = 3000;

// Dados mock para a aplicação
const produtosMock = [
    // BOLOS
    {
        id: 1,
        nome: "Bolo de Chocolate Premium",
        preco: 45.90,
        categoria: "bolos",
        descricao: "Delicioso bolo de chocolate com cobertura cremosa e recheio de brigadeiro",
        tempo_preparo: "2-3 horas",
        disponivel: true,
        destaque: true
    },
    {
        id: 2,
        nome: "Bolo Red Velvet",
        preco: 52.00,
        categoria: "bolos",
        descricao: "Clássico bolo americano com massa vermelha e cream cheese",
        tempo_preparo: "3-4 horas",
        disponivel: true,
        destaque: false
    },
    {
        id: 3,
        nome: "Bolo de Cenoura com Chocolate",
        preco: 38.50,
        categoria: "bolos",
        descricao: "Tradicional bolo de cenoura com cobertura de chocolate",
        tempo_preparo: "2 horas",
        disponivel: true,
        destaque: false
    },
    
    // CUPCAKES
    {
        id: 4,
        nome: "Cupcake de Morango",
        preco: 8.50,
        categoria: "cupcakes",
        descricao: "Cupcake fofo com recheio de morango e chantilly",
        tempo_preparo: "1 hora",
        disponivel: true,
        destaque: false
    },
    {
        id: 5,
        nome: "Cupcake de Chocolate",
        preco: 9.00,
        categoria: "cupcakes",
        descricao: "Cupcake de chocolate com ganache e granulado",
        tempo_preparo: "1 hora",
        disponivel: true,
        destaque: true
    },
    {
        id: 6,
        nome: "Cupcake de Baunilha",
        preco: 7.50,
        categoria: "cupcakes",
        descricao: "Cupcake clássico de baunilha com buttercream colorido",
        tempo_preparo: "45 minutos",
        disponivel: true,
        destaque: false
    },
    
    // TORTAS
    {
        id: 7,
        nome: "Torta de Limão",
        preco: 35.00,
        categoria: "tortas",
        descricao: "Torta cremosa de limão com merengue dourado",
        tempo_preparo: "3-4 horas",
        disponivel: true,
        destaque: false
    },
    {
        id: 8,
        nome: "Torta de Morango",
        preco: 42.00,
        categoria: "tortas",
        descricao: "Torta com creme de confeiteiro e morangos frescos",
        tempo_preparo: "4 horas",
        disponivel: true,
        destaque: true
    },
    {
        id: 9,
        nome: "Torta Holandesa",
        preco: 48.00,
        categoria: "tortas",
        descricao: "Torta gelada com creme de leite ninho e chocolate",
        tempo_preparo: "5 horas",
        disponivel: true,
        destaque: false
    },
    
    // DOCES
    {
        id: 10,
        nome: "Brigadeiro Gourmet",
        preco: 3.50,
        categoria: "doces",
        descricao: "Brigadeiro artesanal com chocolate belga",
        tempo_preparo: "30 minutos",
        disponivel: true,
        destaque: false
    },
    {
        id: 11,
        nome: "Beijinho Premium",
        preco: 3.50,
        categoria: "doces",
        descricao: "Beijinho com coco fresco e leite condensado artesanal",
        tempo_preparo: "30 minutos",
        disponivel: true,
        destaque: false
    },
    {
        id: 12,
        nome: "Casadinho Gourmet",
        preco: 4.00,
        categoria: "doces",
        descricao: "Metade brigadeiro, metade beijinho - o melhor dos dois mundos",
        tempo_preparo: "45 minutos",
        disponivel: true,
        destaque: true
    },
    {
        id: 13,
        nome: "Trufa de Chocolate",
        preco: 5.50,
        categoria: "doces",
        descricao: "Trufa artesanal com chocolate 70% cacau",
        tempo_preparo: "1 hora",
        disponivel: true,
        destaque: false
    },
    
    // ESPECIAIS
    {
        id: 14,
        nome: "Kit Festa Infantil",
        preco: 85.00,
        categoria: "kits",
        descricao: "1 bolo pequeno + 12 cupcakes + 20 docinhos variados",
        tempo_preparo: "4-5 horas",
        disponivel: true,
        destaque: true
    },
    {
        id: 15,
        nome: "Bolo Personalizado",
        preco: 120.00,
        categoria: "personalizados",
        descricao: "Bolo decorado conforme sua preferência - consulte disponibilidade",
        tempo_preparo: "24-48 horas",
        disponivel: true,
        destaque: true
    }
];

let pedidosMock = [
    {
        id: 1,
        produtos: [
            { nome: "Bolo de Chocolate Premium", quantidade: 1, preco: 45.90 }
        ],
        total: 45.90,
        status: "Em preparo",
        data_criacao: new Date().toISOString(),
        cliente: { nome: "Cliente Exemplo", email: "cliente@exemplo.com" }
    }
];

const server = http.createServer((req, res) => {
    console.log(`Requisição recebida: ${req.method} ${req.url}`);
    
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Servir a aplicação web
    if (pathname === '/app' || pathname === '/web-app.html') {
        const filePath = path.join(__dirname, 'web-app.html');
        
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>404 - Aplicação não encontrada</h1>');
                return;
            }
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
    }
    // Servir a página index.html na raiz
    else if (pathname === '/' || pathname === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>404 - Página não encontrada</h1>');
                return;
            }
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
    }
    // API de produtos
    else if (pathname === '/api/produtos') {
        if (req.method === 'GET') {
            const categoria = parsedUrl.query.categoria;
            const destaque = parsedUrl.query.destaque;
            
            let produtos = produtosMock;
            
            if (categoria) {
                produtos = produtos.filter(p => p.categoria === categoria);
            }
            
            if (destaque === 'true') {
                produtos = produtos.filter(p => p.destaque === true);
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                success: true,
                data: produtos,
                total: produtos.length
            }));
        }
    }
    // API de categorias
    else if (pathname === '/api/categorias') {
        if (req.method === 'GET') {
            const categorias = [...new Set(produtosMock.map(p => p.categoria))];
            const categoriasComContador = categorias.map(cat => ({
                nome: cat,
                quantidade: produtosMock.filter(p => p.categoria === cat).length
            }));
            
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                success: true,
                data: categoriasComContador,
                total: categoriasComContador.length
            }));
        }
    }
    // API de pedidos
    else if (pathname === '/api/pedidos') {
        if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                success: true,
                data: pedidosMock,
                total: pedidosMock.length
            }));
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const pedidoData = JSON.parse(body);
                    const novoPedido = {
                        id: pedidosMock.length + 1,
                        produtos: pedidoData.produtos,
                        total: pedidoData.produtos.reduce((sum, p) => sum + (p.preco * p.quantidade), 0),
                        status: "Recebido",
                        data_criacao: new Date().toISOString(),
                        cliente: pedidoData.cliente || { nome: "Cliente Web", email: "cliente@exemplo.com" }
                    };
                    
                    pedidosMock.push(novoPedido);
                    
                    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: true,
                        data: novoPedido,
                        message: "Pedido criado com sucesso!"
                    }));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: false,
                        message: "Erro ao processar pedido: " + error.message
                    }));
                }
            });
        }
    }
    // Status da API
    else if (pathname === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            projeto: 'Açucaradas Encomendas',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            port: PORT,
            endpoints: {
                '/': 'Website institucional',
                '/app': 'Aplicação web',
                '/api/produtos': 'Lista de produtos disponíveis',
                '/api/pedidos': 'Gerenciamento de pedidos',
                '/status': 'Status da API'
            }
        }, null, 2));
    }
    // Servir arquivos estáticos (CSS, JS, imagens)
    else if (pathname.startsWith('/assets/') || pathname.startsWith('/css/') || pathname.startsWith('/js/') || pathname.startsWith('/images/')) {
        const filePath = path.join(__dirname, pathname);
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Arquivo não encontrado');
                return;
            }
            
            // Determinar Content-Type baseado na extensão
            const ext = path.extname(filePath).toLowerCase();
            const contentTypes = {
                '.css': 'text/css',
                '.js': 'application/javascript',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon'
            };
            
            const contentType = contentTypes[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    }
    else {
        // Para outras rotas, retornar 404
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <h1>404 - Página não encontrada</h1>
            <p>Rotas disponíveis:</p>
            <ul>
                <li><a href="/">Website institucional</a></li>
                <li><a href="/app">Aplicação web</a></li>
                <li><a href="/status">Status da API</a></li>
            </ul>
        `);
    }
});

function startServer(port) {
    server.listen(port, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${port}`);
        console.log(`📱 Projeto: Açucaradas Encomendas`);
        console.log(`⚡ Node.js: ${process.version}`);
        console.log(`🎯 Acesse: http://localhost:${port} para ver a demonstração`);
        console.log(`📊 Status: http://localhost:${port}/status`);
        PORT = port;
    });
}

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ Porta ${PORT} já está em uso. Tentando porta ${PORT + 1}...`);
        PORT++;
        if (PORT > 3010) {
            console.error('❌ Não foi possível encontrar uma porta disponível');
            process.exit(1);
        }
        startServer(PORT);
    } else {
        console.error('Erro no servidor:', err);
    }
});

// Iniciar servidor
startServer(PORT);