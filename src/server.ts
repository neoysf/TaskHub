import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { initIO } from "./sockets/io";

const app = createApp();
const httpServer = http.createServer(app);
initIO(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`🚀 TaskHub backend running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Health: http://localhost:${env.PORT}/health`);
});

process.on("SIGTERM", () => { httpServer.close(() => process.exit(0)); });
process.on("SIGINT", () => { httpServer.close(() => process.exit(0)); });
