import Hapi from "@hapi/hapi";
import { describe } from "@mainsail/test-runner";
import { type AddressInfo } from "node:net";
import { WebSocketServer } from "ws";

import { Client } from "./client";
import { errorTypes } from "./constants";
import { plugin } from "./plugin";

// client.test.ts is skipped as a whole; these cover the connect timeout on their own.
describe("Client connect", ({ it, assert, beforeEach, nock }) => {
	beforeEach(() => {
		nock.enableNetConnect();
	});

	it("#connect - should time out when the server never answers the hello", async () => {
		// Accepts the socket, then stays silent: the handshake succeeds but the hello gets no reply.
		const server = new WebSocketServer({ port: 0 });
		server.on("connection", (socket) => socket.on("message", () => {}));
		const { port } = server.address() as AddressInfo;

		const client = new Client(`ws://127.0.0.1:${port}`, { timeout: 60_000 });
		const errors: Error[] = [];
		client.onError = (error) => errors.push(error);
		let disconnected = 0;
		client.onDisconnect = () => disconnected++;

		try {
			const started = Date.now();
			const error = await client.connect({ reconnect: false, timeout: 100 }).then(
				() => undefined,
				(error) => error,
			);

			// Bounded by the connect timeout, not by the request timeout plus the close handshake.
			assert.lt(Date.now() - started, 1000);
			assert.equal(error.type, errorTypes.TIMEOUT);
			assert.equal(error.message, "Connection timed out");

			await new Promise((resolve) => setTimeout(resolve, 50));
			assert.equal(disconnected, 1);
			assert.length(errors, 0);
			assert.equal(server.clients.size, 0);
		} finally {
			server.close();
		}
	});

	it("#connect - should clear the timeout once the hello succeeded", async () => {
		const server = Hapi.server({ port: 0 });
		await server.register({ options: {}, plugin });
		await server.start();

		const client = new Client(`ws://127.0.0.1:${server.info.port}`, { timeout: 60_000 });
		const errors: Error[] = [];
		client.onError = (error) => errors.push(error);

		try {
			await client.connect({ reconnect: false, timeout: 100 });
			assert.defined(client.id);

			await new Promise((resolve) => setTimeout(resolve, 200));
			assert.length(errors, 0);
			assert.true(client._isReady());
		} finally {
			await client.disconnect();
			await server.stop();
		}
	});
});
