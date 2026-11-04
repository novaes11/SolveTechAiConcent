const path = require('path');
const express = require('express');
const apiRoutes = require('./routes');
const Logger = require('./core/logger');

const logger = new Logger('HTTP');
const app = express();

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de normalização para rewrites Serverless da Vercel (/api/index.js)
app.use((req, res, next) => {
    if (req.url.startsWith('/api/index.js')) {
        req.url = req.url.replace('/api/index.js', '') || '/';
    }
    next();
});

// Middleware de log de requisições
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
});

// Rota padronizada de healthcheck para execução Serverless/Vercel
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        pipeline: 'running',
        service: 'SolveTechAi Clinical API',
        timestamp: new Date().toISOString()
    });
});

// Arquivos estáticos e template
app.use('/assets', express.static(path.resolve(__dirname, '../assets')));
app.use(express.static(path.resolve(__dirname, '../template')));

// Rotas da API REST
app.use('/api', apiRoutes);

module.exports = app;
