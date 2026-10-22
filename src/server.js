const app = require('./app');
const Logger = require('./core/logger');

const logger = new Logger('Server');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    logger.info(`Servidor SolveTechAi em execução na porta http://localhost:${PORT}`);
    logger.info(`Healthcheck disponível em http://localhost:${PORT}/api/health`);
});
