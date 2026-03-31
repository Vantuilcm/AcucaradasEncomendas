const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// 🏢 Middleware de Autenticação Multi-tenant (Simplificado)
app.use((req, res, next) => {
    const tenantId = req.headers['x-tenant-id'] || 'acucaradas';
    const apiKey = req.headers['x-api-key'];

    // Em produção, validaríamos a API Key no saas/tenants.json
    req.tenantId = tenantId;
    process.env.GROWTHOS_TENANT_ID = tenantId;
    next();
});

// 🚀 GrowthOS Engine API - Gateway para os scripts de IA
app.get('/api/v1/status', (req, res) => {
    const statusPath = path.join(__dirname, `data/${req.tenantId}/history/pipeline-status.json`);
    if (fs.existsSync(statusPath)) {
        return res.json(JSON.parse(fs.readFileSync(statusPath)));
    }
    res.status(404).json({ error: 'Tenant data not found' });
});

// 💰 Pricing Engine API
app.post('/api/v1/pricing/optimize', (req, res) => {
    console.log(`[SaaS] Executando Pricing Engine para: ${req.tenantId}`);
    
    exec(`bash scripts/ci/pricing-engine.sh`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message, details: stderr });
        }
        res.json({ message: 'Pricing optimization completed', output: stdout });
    });
});

// 📈 Demand Forecast API
app.get('/api/v1/forecast', (req, res) => {
    const forecastPath = path.join(__dirname, `data/${req.tenantId}/market/demand-forecast.json`);
    if (fs.existsSync(forecastPath)) {
        return res.json(JSON.parse(fs.readFileSync(forecastPath)));
    }
    res.status(404).json({ error: 'Forecast not available' });
});

// 🌍 Strategic Decision API
app.post('/api/v1/market/decision', (req, res) => {
    exec(`bash scripts/ci/market-decision.sh`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json({ message: 'Strategic decision generated', output: stdout });
    });
});

// 📊 Dashboard Data API
app.get('/api/v1/dashboard', (req, res) => {
    const tenantData = {
        tenantId: req.tenantId,
        history: [],
        market: [],
        growth: []
    };

    const historyPath = path.join(__dirname, `data/${req.tenantId}/history/release-history.json`);
    const marketPath = path.join(__dirname, `data/${req.tenantId}/market/market-history.json`);

    if (fs.existsSync(historyPath)) tenantData.history = JSON.parse(fs.readFileSync(historyPath));
    if (fs.existsSync(marketPath)) tenantData.market = JSON.parse(fs.readFileSync(marketPath));

    res.json(tenantData);
});

app.listen(port, () => {
    console.log(`🚀 GrowthOS API rodando na porta ${port}`);
    console.log(`🔗 Tenant context: multi-tenant enabled`);
});
