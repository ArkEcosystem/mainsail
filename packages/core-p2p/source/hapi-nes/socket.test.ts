import { describe } from "@arkecosystem/core-test-framework";

import * as Hapi from "@hapi/hapi";
import * as Hoek from "@hapi/hoek";
import * as Teamwork from "@hapi/teamwork";
import { Client } from "./client";
import { plugin } from "./plugin";
import { Socket } from "./socket";
import { stringifyNesMessage } from "./utils";
import { default as Ws } from "ws";
import delay from "delay";

describe("Socket", ({ it, spy, beforeEach, assert, nock, each }) => {
	beforeEach(() => {
		nock.enableNetConnect();
	});

	it("exposes app namespace", async () => {
		const server = Hapi.server();

		const bufHello = Buffer.from("hello");
		const onConnection = (socket) => {
			socket.app.x = bufHello;
		};

		await server.register({ plugin: plugin, options: { onConnection } });

		server.route({
			method: "POST",
			path: "/",
			handler: (request) => {
				assert.defined(request.socket.server);
				return request.socket.app.x;
			},
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		// @ts-ignore
		const { payload, statusCode } = await client.request("/");
		assert.equal(payload, bufHello);
		assert.equal(statusCode, 200);

		await client.disconnect();
		await server.stop();
	});

	it("includes socket info", async () => {
		const team = new Teamwork.Team();
		const server = Hapi.server();

		const onConnection = (socket) => {
			assert.equal(socket.info.remoteAddress, "127.0.0.1");
			assert.number(socket.info.remotePort);

			team.attend();
		};

		await server.register({ plugin: plugin, options: { onConnection } });

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		await client.disconnect();
		await team.work;
		await server.stop();
	});

	it("#_send - errors on invalid message", async () => {
		const server = Hapi.server();
		await server.register({ plugin: plugin, options: {} });

		const log = server.events.once("log");

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		client.onError = Hoek.ignore;
		await client.connect();

		const a = { payload: 11111111, type: "other" };

		server.plugins.nes._listener._sockets._forEach(async (socket) => {
			try {
				await socket._send(a, null, Hoek.ignore);
			} catch {}
		});

		const [event] = await log;
		assert.equal(event.data, "other");
		await client.disconnect();
		await server.stop();
	});

	it("#_send  reuses previously stringified value", async () => {
		const server = Hapi.server();
		await server.register({ plugin: plugin, options: {} });

		const bufResponse = Buffer.from(JSON.stringify({ a: 1, b: 2 }));
		server.route({
			method: "POST",
			path: "/",
			handler: (request, h) => {
				return h.response(bufResponse);
			},
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		// @ts-ignore
		const { payload, statusCode } = await client.request("/");
		assert.equal(payload, bufResponse);
		assert.equal(statusCode, 200);

		await client.disconnect();
		await server.stop();
	});

	it("#_flush - errors on socket send error", async () => {
		const server = Hapi.server();

		const onConnection = (socket) => {
			socket._ws.send = (message, next) => next(new Error());
		};

		await server.register({ plugin: plugin, options: { payload: { maxChunkChars: 5 }, onConnection } });

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		client.onError = Hoek.ignore;

		await assert.rejects(() => client.connect({ timeout: 100 }), "Request failed - server disconnected");

		await client.disconnect();
		await server.stop();
	});

	it("#_onMessage - supports route id", async () => {
		const server = Hapi.server();
		await server.register({ plugin: plugin, options: {} });

		const bufHello = Buffer.from("hello");
		server.route({
			method: "POST",
			path: "/",
			config: {
				id: "resource",
				handler: () => bufHello,
			},
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		// @ts-ignore
		const { payload, statusCode } = await client.request("resource");
		assert.equal(payload, bufHello);
		assert.equal(statusCode, 200);

		await client.disconnect();
		await server.stop();
	});

	it("#_onMessage - errors on unknown route id", async () => {
		const server = Hapi.server();
		await server.register({ plugin: plugin, options: {} });

		server.route({
			method: "POST",
			path: "/",
			config: {
				id: "resource",
				handler: () => "hello",
			},
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		await assert.rejects(() => client.request("something"));

		await client.disconnect();
		await server.stop();
	});

	it("#_onMessage - errors on wildcard method route id", async () => {
		const server = Hapi.server();
		await server.register({ plugin: plugin, options: {} });

		server.route({
			method: "*",
			path: "/",
			config: {
				id: "resource",
				handler: () => "hello",
			},
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		await assert.rejects(() => client.request("resource"));

		await client.disconnect();
		await server.stop();
	});

	it("#_onMessage - terminates on invalid request message", async () => {
		const server = Hapi.server();
		await server.register({ plugin: plugin, options: {} });

		server.route({
			method: "POST",
			path: "/",
			handler: () => "hello",
		});

		await server.start();
		const client = new Ws("http://127.0.0.1:" + server.info.port);
		client.onerror = Hoek.ignore;

		const sendInvalid = async () =>
			new Promise<void>((resolve, reject) => {
				client.on("open", () => {
					client.send("{", {} as any, () => resolve());
				});
			});

		await sendInvalid();
		await delay(1000);

		assert.equal(client.readyState, client.CLOSED);

		client.close();
		await server.stop();
	});

	it("#_onMessage - terminates on uninitialized connection", async () => {
		const server = Hapi.server();
		await server.register({ plugin: plugin, options: {} });

		server.route({
			method: "POST",
			path: "/",
			handler: () => "hello",
		});

		await server.start();
		const client = new Ws("http://127.0.0.1:" + server.info.port);
		client.onerror = Hoek.ignore;

		client.on("open", () => client.send(stringifyNesMessage({ id: 1, type: "request", path: "/" }), Hoek.ignore));

		await delay(1000);

		assert.equal(client.readyState, client.CLOSED);

		client.close();
		await server.stop();
	});

	it("#_onMessage - terminates on missing path", async () => {
		const server = Hapi.server();
		await server.register({ plugin: plugin, options: {} });

		server.route({
			method: "POST",
			path: "/",
			handler: () => "hello",
		});

		await server.start();
		const client = new Ws("http://127.0.0.1:" + server.info.port);
		client.onerror = Hoek.ignore;

		client.on("open", () =>
			client.send(stringifyNesMessage({ id: 1, type: "request", version: "2" }), Hoek.ignore),
		);

		await delay(1000);

		assert.equal(client.readyState, client.CLOSED);

		client.close();
		await server.stop();
	});

	it("#_onMessage - terminates on unknown type", async () => {
		const server = Hapi.server();
		await server.register({ plugin: plugin, options: {} });

		server.route({
			method: "POST",
			path: "/",
			handler: () => "hello",
		});

		await server.start();
		const client = new Ws("http://127.0.0.1:" + server.info.port);
		client.onerror = Hoek.ignore;

		client.on("open", () => client.send(stringifyNesMessage({ id: 1, type: "??", version: "2" }), Hoek.ignore));

		await delay(1000);

		assert.equal(client.readyState, client.CLOSED);

		client.close();
		await server.stop();
	});

	it("#_onMessage - terminates on incorrect version", async () => {
		const server = Hapi.server();
		await server.register({ plugin: plugin, options: {} });

		await server.start();
		const client = new Ws("http://127.0.0.1:" + server.info.port);
		client.onerror = Hoek.ignore;

		client.on("open", () => client.send(stringifyNesMessage({ id: 1, type: "hello", version: "1" }), Hoek.ignore));

		await delay(1000);

		assert.equal(client.readyState, client.CLOSED);

		client.close();
		await server.stop();
	});

	it("#_onMessage - terminates on missing version", async () => {
		const server = Hapi.server();
		await server.register({ plugin: plugin, options: {} });

		await server.start();
		const client = new Ws("http://127.0.0.1:" + server.info.port);
		client.onerror = Hoek.ignore;

		client.on("open", () => client.send(stringifyNesMessage({ id: 1, type: "hello" }), Hoek.ignore));

		await delay(1000);

		assert.equal(client.readyState, client.CLOSED);
		client.close();
		await server.stop();
	});

	each(
		"terminates on ws.ping/pong",
		async ({ dataset: method }) => {
			const server = Hapi.server();
			await server.register({ plugin: plugin, options: {} });

			server.route({
				method: "POST",
				path: "/",
				handler: () => "hello",
			});

			await server.start();
			const client = new Ws("http://127.0.0.1:" + server.info.port);
			client.onerror = Hoek.ignore;

			const sendPingOrPong = async () =>
				new Promise<void>((resolve, reject) => {
					client.on("open", () => {
						client[method]("", true, () => resolve());
					});
				});

			await sendPingOrPong();
			await delay(1000);

			assert.equal(client.readyState, client.CLOSED);

			client.close();
			await server.stop();
		},
		[["ping"], ["pong"]],
	);

	it("#_processRequest - exposes socket to request", async () => {
		const server = Hapi.server();
		await server.register({ plugin: plugin, options: {} });

		server.route({
			method: "POST",
			path: "/",
			handler: (request) => request.socket.id,
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		// @ts-ignore
		const { payload } = await client.request("/");
		assert.equal(payload, Buffer.from(client.id));

		await client.disconnect();
		await server.stop();
	});
});
