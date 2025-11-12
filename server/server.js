const HttpServer = require('./core/httpServer');
const WsHub = require('./core/wsHub');
const restRouter = require('./presentation/restRouter');
const registerWs = require('./presentation/wsRouter');
const { dbClient, tokenService } = require('./shared/container');

async function bootstrap() {
  await dbClient.init();
  const httpServer = new HttpServer({ restRouter });
  const server = httpServer.start();
  const wsHub = new WsHub({ server, tokenService });
  registerWs(wsHub);
}

bootstrap().catch((err) => {
  console.error('Failed to start MessZola server', err);
  process.exit(1);
});
