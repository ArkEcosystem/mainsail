import { createServer, type Server } from "node:http";

// A server that serves nothing over plain HTTP; only the WebSocket upgrade is accepted.
const createHttpServer = (): Server =>
	createServer((_, response) => {
		response.writeHead(426, { Connection: "close", Upgrade: "websocket" }).end();
	});

// Resolves once the server is listening; rejects with the listen error (busy port, EACCES, ...).
const listen = (server: Server, options: { host: string; port: number }): Promise<void> =>
	new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(options.port, options.host, () => {
			server.off("error", reject);
			resolve();
		});
	});

// Resolves once the port is released. Idle keep-alive connections are dropped so this does not hang.
const close = (server: Server): Promise<void> =>
	new Promise<void>((resolve) => {
		if (!server.listening) {
			resolve();
			return;
		}

		server.close(() => resolve());
		server.closeIdleConnections();
	});

export { close, createHttpServer, listen };
