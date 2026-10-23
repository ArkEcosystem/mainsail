import { createServer, type Server } from "node:http";

// A server that serves nothing over plain HTTP; only the WebSocket upgrade is accepted.
export const createHttpServer = (): Server =>
	createServer((_, response) => {
		response.writeHead(426, { Connection: "close", Upgrade: "websocket" }).end();
	});
