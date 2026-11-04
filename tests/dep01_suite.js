const assert = require('assert');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const serverlessHandler = require('../api/index');
const exportedServerApp = require('../src/server');

async function runDep01Suite() {
    console.log('[TEST 18.06] Iniciando suite de validacao para DEP-01 (Entrypoint Express 5.x Vercel Serverless)...');

    // 1. Validar exportacao do entrypoint Serverless (/api/index.js) e server.js sem porta fixa
    assert.strictEqual(typeof serverlessHandler, 'function', 'api/index.js deve exportar a funcao/app do Express');
    assert.strictEqual(serverlessHandler, app, 'api/index.js deve exportar a mesma instancia de src/app.js');
    assert.strictEqual(exportedServerApp, app, 'src/server.js deve exportar o app sem iniciar listen() quando importado');
    console.log('✓ Entrypoint Serverless [api/index.js] e exportacao sem servidor fixo: OK');

    // 2. Validar configuracao de rewrites no vercel.json
    const vercelConfigPath = path.resolve(__dirname, '../vercel.json');
    assert(fs.existsSync(vercelConfigPath), 'Arquivo vercel.json deve existir na raiz do projeto');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));
    assert(Array.isArray(vercelConfig.rewrites), 'vercel.json deve conter array de rewrites');
    assert(
        vercelConfig.rewrites.some((r) => r.destination === '/api/index.js'),
        'vercel.json deve direcionar rewrites para /api/index.js'
    );
    console.log('✓ Configuracao de rewrites em [vercel.json]: OK');

    // 3. Testar endpoints HTTP e middleware de normalizacao usando servidor efemero
    const server = serverlessHandler.listen(0);
    const port = server.address().port;
    const rootUrl = `http://localhost:${port}`;

    try {
        // 3.1 Rota GET /health padronizada (Criterio de Aceite Notion DEP-01)
        const healthRootRes = await fetch(`${rootUrl}/health`);
        assert.strictEqual(healthRootRes.status, 200, 'GET /health deve retornar status 200');
        const healthRootData = await healthRootRes.json();
        assert.strictEqual(healthRootData.status, 'ok', 'GET /health deve retornar status: ok');
        assert.strictEqual(healthRootData.pipeline, 'running', 'GET /health deve retornar pipeline: running');
        console.log('✓ Criterio de Aceite [GET /health -> { status: "ok", pipeline: "running" }]: OK');

        // 3.2 Rota GET /api/health
        const healthApiRes = await fetch(`${rootUrl}/api/health`);
        assert.strictEqual(healthApiRes.status, 200, 'GET /api/health deve retornar status 200');
        const healthApiData = await healthApiRes.json();
        assert.strictEqual(healthApiData.status, 'ok', 'GET /api/health deve retornar status: ok');
        assert.strictEqual(healthApiData.pipeline, 'running', 'GET /api/health deve retornar pipeline: running');
        console.log('✓ Compatibilidade [GET /api/health -> { status: "ok", pipeline: "running" }]: OK');

        // 3.3 Middleware de normalizacao para rewrites da Vercel (/api/index.js)
        const rewriteHealthRes = await fetch(`${rootUrl}/api/index.js/health`);
        assert.strictEqual(rewriteHealthRes.status, 200, 'Rewrite /api/index.js/health deve ser normalizado e retornar 200');
        const rewriteHealthData = await rewriteHealthRes.json();
        assert.strictEqual(rewriteHealthData.status, 'ok', 'Rewrite /api/index.js/health deve retornar status: ok');
        assert.strictEqual(rewriteHealthData.pipeline, 'running', 'Rewrite /api/index.js/health deve retornar pipeline: running');

        const rewriteApiPatientsRes = await fetch(`${rootUrl}/api/index.js/api/patients`);
        assert.strictEqual(rewriteApiPatientsRes.status, 200, 'Rewrite /api/index.js/api/patients deve retornar 200');
        console.log('✓ Middleware de normalizacao de rewrites Vercel [/api/index.js/*]: OK');

        console.log('\n[TEST 18.06] Todos os cenarios da suite DEP-01 foram executados com 100% de sucesso.');
        server.close();
    } catch (err) {
        server.close();
        throw err;
    }
}

runDep01Suite().catch((err) => {
    console.error('[TEST 18.06] Falha na suite de testes DEP-01:', err.message);
    process.exitCode = 1;
});
