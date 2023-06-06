import { Identifiers } from "@mainsail/contracts";
import { describeSkip, Sandbox } from "../../../test-framework";

import * as Hapi from "@hapi/hapi";
import * as Hoek from "@hapi/hoek";
import * as Teamwork from "@hapi/teamwork";
import { Client } from "./client";
import { plugin } from "./plugin";
import { stringifyNesMessage } from "./utils";

describeSkip<{}>("Client", ({ it, spy, beforeEach, assert, nock, each }) => {
	const createServerWithPlugin = async (pluginOptions = {}, serverOptions = {}, withPreResponseHandler = false) => {
		const server = Hapi.server(serverOptions);
		await server.register({ plugin: plugin, options: pluginOptions });

		server.ext({
			type: "onPostAuth",
			async method(request, h) {
				request.payload = (request.payload || Buffer.from("")).toString();
				return h.continue;
			},
		});

		if (withPreResponseHandler) {
			server.ext({
				type: "onPreResponse",
				method: async (request, h) => {
					try {
						if (request.response.source) {
							request.response.source = Buffer.from(request.response.source);
						} else {
							const errorMessage =
								request.response.output?.payload?.message ??
								request.response.output?.payload?.error ??
								"Error";
							request.response.output.payload = Buffer.from(errorMessage, "utf-8");
						}
					} catch (e) {
						request.response.statusCode = 500; // Internal server error (serializing failed)
						request.response.output = {
							statusCode: 500,
							payload: Buffer.from("Internal server error"),
							headers: {},
						};
					}
					return h.continue;
				},
			});
		}

		return server;
	};

	beforeEach(() => {
		nock.enableNetConnect();
	});

	it("defaults options.ws.maxPayload to 102400 (node) && perMessageDeflate to false", () => {
		const client = new Client("http://127.0.0.1");
		// @ts-ignore
		assert.equal(client._settings.ws, { maxPayload: 102400, perMessageDeflate: false });
	});

	it("allows setting options.ws.maxPayload (node)", () => {
		const client = new Client("http://127.0.0.1", { ws: { maxPayload: 100 } });
		// @ts-ignore
		assert.equal(client._settings.ws, { maxPayload: 100, perMessageDeflate: false });
	});

	it("prevents setting options.ws.perMessageDeflate (node)", () => {
		const client = new Client("http://127.0.0.1", { ws: { perMessageDeflate: true } });
		// @ts-ignore
		assert.equal(client._settings.ws, { maxPayload: 102400, perMessageDeflate: false });
	});

	it("does not reset maxPayload on socket after receiving ping message", async () => {
		const server = await createServerWithPlugin({ heartbeat: { interval: 20, timeout: 10 } });
		await server.start();

		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect({ reconnect: false });
		client.onError = Hoek.ignore;

		client.setMaxPayload(204800); // setting here after the initial "hello"

		await Hoek.wait(30);

		// @ts-ignore
		assert.equal(client._ws._receiver._maxPayload, 204800);

		await client.disconnect();
		await server.stop();
	});

	it("#onError - logs error to console by default", async () => {
		const server = await createServerWithPlugin();
		await server.start();

		const client = new Client("http://127.0.0.1:" + server.info.port);

		const team = new Teamwork.Team();
		const orig = console.error;
		console.error = (err) => {
			assert.defined(err);
			console.error = orig;
			client.disconnect();
			team.attend();
		};

		await client.connect({ reconnect: false });
		// @ts-ignore
		client._ws.emit("error", new Error("test"));
		await team.work;

		await server.stop();
	});

	it("#connect - reconnects when server initially down", async () => {
		const server1 = await createServerWithPlugin();
		await server1.start();
		const port = server1.info.port;
		await server1.stop();

		const client = new Client("http://127.0.0.1:" + port);
		client.onError = Hoek.ignore;

		const team = new Teamwork.Team({ meetings: 2 });

		client.onConnect = () => {
			team.attend();
		};

		let reconnecting = false;
		client.onDisconnect = (willReconnect, log) => {
			reconnecting = willReconnect;
			team.attend();
		};

		await assert.rejects(() => client.connect({ delay: 10 }), "Connection terminated while waiting to connect");

		const server2 = await createServerWithPlugin({}, { port });
		server2.route({ path: "/", method: "POST", handler: () => "ok" });
		await server2.start();

		await team.work;

		assert.true(reconnecting);

		const res = await client.request("/");
		// @ts-ignore
		assert.equal(res.payload, Buffer.from("ok"));

		client.disconnect();
		await server2.stop();
	});

	it("#connect - fails to connect", async () => {
		const client = new Client("http://0");

		await assert.rejects(() => client.connect({ delay: 10 }), "Connection terminated while waiting to connect");
		await client.disconnect();
	});

	it("#connect - errors if already connected", async () => {
		const server = await createServerWithPlugin();
		await server.start();

		const client = new Client("http://127.0.0.1:" + server.info.port);

		await client.connect({ reconnect: false });
		await assert.rejects(() => client.connect(), "Already connected");

		await client.disconnect();
		await server.stop();
	});

	it("#connect - errors if set to reconnect", async () => {
		const server = await createServerWithPlugin();
		await server.start();

		const client = new Client("http://127.0.0.1:" + server.info.port);

		await client.connect();
		await assert.rejects(() => client.connect(), "Cannot connect while client attempts to reconnect");
		await client.disconnect();
		await server.stop();
	});

	it("#_connect - handles unknown error code", async () => {
		const server = await createServerWithPlugin();
		await server.start();

		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		const team = new Teamwork.Team();
		client.onError = Hoek.ignore;
		client.onDisconnect = (willReconnect, log) => {
			assert.equal(log.explanation, "Unknown");
			client.disconnect();
			team.attend();
		};

		// @ts-ignore
		client._ws.onclose({ code: 9999, reason: "bug", wasClean: false });
		await team.work;
		await server.stop();
	});

	it("#disconnect - ignores when client not connected", () => {
		const client = new Client(undefined);
		client.disconnect();
	});

	it("#disconnect- ignores when client is disconnecting", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		await client.disconnect();
		await Hoek.wait(5);
		await client.disconnect();
		await server.stop();
	});

	it("#disconnect - avoids closing a socket in closing state", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		// @ts-ignore
		client._ws.close();
		await client.disconnect();
		await server.stop();
	});

	it("#disconnect- disconnects once", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		let disconnected = 0;
		client.onDisconnect = (willReconnect, log) => ++disconnected;

		client.disconnect();
		client.disconnect();
		await client.disconnect();

		await Hoek.wait(50);

		assert.equal(disconnected, 1);
		await server.stop();
	});

	it("#disconnect - logs manual disconnection request", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		const team = new Teamwork.Team();
		client.onDisconnect = (willReconnect, log) => {
			assert.true(log.wasRequested);
			team.attend();
		};

		client.disconnect();

		await team.work;
		await server.stop();
	});

	it.skip("#disconnect - logs error disconnection request as not requested", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		client.onError = Hoek.ignore;
		await client.connect();

		const team = new Teamwork.Team();
		client.onDisconnect = (willReconnect, log) => {
			assert.false(log.wasRequested);
			team.attend();
		};

		// @ts-ignore
		client._ws.close();

		await team.work;
		await server.stop();
	});

	it.skip("#disconnect - logs error disconnection request as not requested after manual disconnect while already disconnected", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		client.onError = Hoek.ignore;
		client.disconnect();
		await client.connect();

		const team = new Teamwork.Team();
		client.onDisconnect = (willReconnect, log) => {
			assert.false(log.wasRequested);
			team.attend();
		};

		// @ts-ignore
		client._ws.close();

		await team.work;
		await server.stop();
	});

	it("#disconnect - allows closing from inside request callback", async () => {
		const server = await createServerWithPlugin();

		server.route({
			method: "POST",
			path: "/",
			handler: () => "hello",
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		await client.request("/");
		client.disconnect();
		await Hoek.wait(100);
		await server.stop();
	});

	it("#_cleanup - ignores when client not connected", () => {
		const client = new Client(undefined);
		// @ts-ignore
		client._cleanup();
	});

	it("#_reconnect - reconnects automatically", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);

		let e = 0;
		client.onError = (err) => {
			assert.undefined(err);
			++e;
		};

		const team = new Teamwork.Team();

		let c = 0;
		client.onConnect = () => {
			++c;
			if (c === 2) {
				assert.equal(e, 0);
				team.attend();
			}
		};

		assert.equal(c, 0);
		assert.equal(e, 0);
		await client.connect({ delay: 10 });

		assert.equal(c, 1);
		assert.equal(e, 0);

		// @ts-ignore
		client._ws.close();

		await team.work;
		await client.disconnect();
		await server.stop();
	});

	it("#_reconnect - aborts reconnecting", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		client.onError = Hoek.ignore;

		let c = 0;
		client.onConnect = () => ++c;

		await client.connect({ delay: 100 });

		// @ts-ignore
		client._ws.close();
		await Hoek.wait(50);
		await client.disconnect();

		assert.equal(c, 1);
		await server.stop();
	});

	it("#_reconnect - does not reconnect automatically", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);

		let e = 0;
		client.onError = (err) => {
			assert.defined(err);
			++e;
		};

		let c = 0;
		client.onConnect = () => ++c;

		let r = "";
		client.onDisconnect = (willReconnect, log) => {
			r += willReconnect ? "t" : "f";
		};

		assert.equal(c, 0);
		assert.equal(e, 0);
		await client.connect({ reconnect: false, delay: 10 });

		assert.equal(c, 1);
		assert.equal(e, 0);

		// @ts-ignore
		client._ws.close();
		await Hoek.wait(15);

		assert.equal(c, 1);
		assert.equal(r, "f");
		await client.disconnect();
		await server.stop();
	});

	it.skip("#_reconnect - overrides max delay", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);

		let c = 0;
		const now = Date.now();
		const team = new Teamwork.Team();
		client.onConnect = () => {
			++c;

			if (c < 6) {
				// @ts-ignore
				client._ws.close();
				return;
			}

			assert.lt(Date.now() - now, 150);

			team.attend();
		};

		await client.connect({ delay: 10, maxDelay: 11 });

		await team.work;
		await client.disconnect();
		await server.stop();
	});

	it("#_reconnect - reconnects automatically (with errors)", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const url = "http://127.0.0.1:" + server.info.port;
		const client = new Client(url);

		let e = 0;
		client.onError = (err) => {
			assert.defined(err);
			assert.equal(err.message, "Connection terminated while waiting to connect");
			assert.equal(err.type, "ws");
			assert.equal(err.isNes, true);

			++e;
			// @ts-ignore
			client._url = "http://127.0.0.1:" + server.info.port;
		};

		let r = "";
		client.onDisconnect = (willReconnect, log) => {
			r += willReconnect ? "t" : "f";
		};

		const team = new Teamwork.Team();

		let c = 0;
		client.onConnect = () => {
			++c;

			if (c < 5) {
				// @ts-ignore
				client._ws.close();

				if (c === 3) {
					// @ts-ignore
					client._url = "http://0";
				}

				return;
			}

			assert.equal(e, 1);
			assert.equal(r, "ttttt");

			team.attend();
		};

		assert.equal(e, 0);
		await client.connect({ delay: 10, maxDelay: 15 });

		await team.work;
		await client.disconnect();
		await server.stop();
	});

	it("#_reconnect - errors on pending request when closed", async () => {
		const server = await createServerWithPlugin();

		server.route({
			method: "POST",
			path: "/",
			handler: async () => {
				await Hoek.wait(10);
				return "hello";
			},
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		const request = client.request("/");
		await client.disconnect();

		await assert.rejects(() => request, "Request failed - server disconnected");
		await server.stop();
	});

	it("#_reconnect - times out", async () => {
		const server = await createServerWithPlugin();

		await server.start();

		const client = new Client("http://127.0.0.1:" + server.info.port);
		// @ts-ignore
		const orig = client._connect;
		// @ts-ignore
		client._connect = (...args) => {
			orig.apply(client, args);
			// @ts-ignore
			client._ws.onopen = null;
		};

		let c = 0;
		client.onConnect = () => ++c;

		let e = 0;
		client.onError = async (err) => {
			++e;
			assert.defined(err);
			assert.equal(err.message, "Connection timed out");
			assert.equal(err.type, "timeout");
			assert.equal(err.isNes, true);

			if (e < 4) {
				return;
			}

			assert.equal(c, 0);
			await client.disconnect();
			await server.stop({ timeout: 1 });
		};

		await assert.rejects(() => client.connect({ delay: 50, maxDelay: 50, timeout: 50 }), "Connection timed out");
	});

	it("#_reconnect - limits retries", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);

		let c = 0;
		client.onConnect = () => {
			++c;
			// @ts-ignore
			client._ws.close();
		};

		let r = "";
		client.onDisconnect = (willReconnect, log) => {
			r += willReconnect ? "t" : "f";
		};

		await client.connect({ delay: 5, maxDelay: 10, retries: 2 });

		await Hoek.wait(100);

		assert.equal(c, 3);
		assert.equal(r, "ttf");
		await client.disconnect();
		await server.stop();
	});

	it("#_reconnect - aborts reconnect if disconnect is called in between attempts", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);

		const team = new Teamwork.Team();

		let c = 0;
		client.onConnect = async () => {
			++c;
			// @ts-ignore
			client._ws.close();

			if (c === 1) {
				setTimeout(() => client.disconnect(), 5);
				await Hoek.wait(15);

				assert.equal(c, 1);
				team.attend();
			}
		};

		await client.connect({ delay: 10 });

		await team.work;
		await server.stop();
	});

	it("#request - defaults to POST", async () => {
		const server = await createServerWithPlugin({ headers: "*" });

		server.route({
			method: "POST",
			path: "/",
			handler: () => "hello",
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		// @ts-ignore
		const { payload, statusCode } = await client.request({ path: "/" });
		assert.equal(payload, Buffer.from("hello"));
		assert.equal(statusCode, 200);

		await client.disconnect();
		await server.stop();
	});

	it("#request - errors when disconnected", async () => {
		const client = new Client(undefined);

		await assert.rejects(() => client.request("/"), "Failed to send message - server disconnected");
	});

	it("#request - errors on invalid payload", async () => {
		const server = await createServerWithPlugin();

		server.route({
			method: "POST",
			path: "/",
			handler: () => "hello",
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		const a = { b: 1 };

		await assert.rejects(
			() => client.request({ method: "POST", path: "/", payload: a }),
			/The first argument must be.*/,
		);
		await client.disconnect();
		await server.stop();
	});

	it("#request - errors on invalid data", async () => {
		const server = await createServerWithPlugin();

		server.route({
			method: "POST",
			path: "/",
			handler: () => "hello",
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		// @ts-ignore
		client._ws.send = () => {
			throw new Error("boom");
		};

		await assert.rejects(() => client.request({ method: "POST", path: "/", payload: "a" }), "boom");
		await client.disconnect();
		await server.stop();
	});

	each(
		"#request - empty response handling",
		async ({ dataset }) => {
			const server = await createServerWithPlugin({ headers: "*" });

			server.route({
				method: "POST",
				path: "/",
				handler: dataset.handler,
			});

			await server.start();
			const client = new Client("http://127.0.0.1:" + server.info.port);
			await client.connect();

			// @ts-ignore
			const { payload } = await client.request({ path: "/" });
			assert.equal(payload, dataset.expectedPayload);

			await client.disconnect();
			await server.stop();
		},
		[
			{
				testName: "handles empty string, no content-type",
				handler: (request, h) => h.response("").code(200),
				expectedPayload: Buffer.alloc(0),
			},
			{
				testName: "handles null, no content-type",
				handler: () => null,
				expectedPayload: Buffer.alloc(0),
			},
			{
				testName: "handles null, application/json",
				handler: (request, h) => h.response(null).type("application/json"),
				expectedPayload: Buffer.alloc(0),
			},
			{
				testName: "handles empty string, text/plain",
				handler: (request, h) => h.response("").type("text/plain").code(200),
				expectedPayload: Buffer.alloc(0),
			},
			{
				testName: "handles null, text/plain",
				handler: (request, h) => h.response(null).type("text/plain"),
				expectedPayload: Buffer.alloc(0),
			},
		],
	);

	it("#_send - catches send error without tracking", async () => {
		const server = await createServerWithPlugin();

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();

		// @ts-ignore
		client._ws.send = () => {
			throw new Error("failed");
		};

		// @ts-ignore
		await assert.rejects(() => client._send({}, false), "failed");

		await client.disconnect();
		await server.stop();
	});

	it("#_onMessage - ignores invalid incoming message", async () => {
		const server = await createServerWithPlugin({}, {}, true);

		server.route({
			method: "POST",
			path: "/",
			handler: async (request) => {
				request.server.plugins.nes._listener._sockets._forEach((socket) => {
					socket._ws.send(Buffer.from("{"));
				});

				await Hoek.wait(10);
				return "hello";
			},
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);

		let logged;
		client.onError = (err) => {
			logged = err;
		};

		await client.connect();

		await client.request("/");
		assert.match(logged.message, /Nes message is below minimum length/);
		assert.equal(logged.type, "protocol");
		assert.equal(logged.isNes, true);

		await client.disconnect();
		await server.stop();
	});

	it("#_onMessage - ignores incoming message with unknown id", async () => {
		const server = await createServerWithPlugin({}, {}, true);

		server.route({
			method: "POST",
			path: "/",
			handler: async (request) => {
				request.server.plugins.nes._listener._sockets._forEach((socket) => {
					socket._ws.send(
						stringifyNesMessage({
							id: 100,
							type: "request",
							statusCode: 200,
							payload: Buffer.from("hello"),
							path: "/",
							version: "1",
							socket: "socketid",
							heartbeat: {
								interval: 10000,
								timeout: 5000,
							},
						}),
					);
				});

				await Hoek.wait(10);
				return "hello";
			},
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);

		let logged;
		client.onError = (err) => {
			logged = err;
		};

		await client.connect();

		await client.request("/");
		assert.equal(logged.message, "Received response for unknown request");
		assert.equal(logged.type, "protocol");
		assert.equal(logged.isNes, true);

		await client.disconnect();
		await server.stop();
	});

	it("#_onMessage - ignores incoming message with undefined type", async () => {
		const server = await createServerWithPlugin({}, {}, true);

		server.route({
			method: "POST",
			path: "/",
			handler: async (request) => {
				request.server.plugins.nes._listener._sockets._forEach((socket) => {
					socket._ws.send(
						stringifyNesMessage({
							id: 2,
							type: "undefined",
							statusCode: 200,
							payload: Buffer.from("hello"),
							path: "/",
							version: "1",
							socket: "socketid",
							heartbeat: {
								interval: 10000,
								timeout: 5000,
							},
						}),
					);
				});

				await Hoek.wait(10);
				return "hello";
			},
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);

		const team = new Teamwork.Team({ meetings: 2 });

		const logged: any[] = [];
		client.onError = (err) => {
			logged.push(err);
			team.attend();
		};

		await client.connect();
		await assert.rejects(() => client.request("/"), "Received invalid response");
		await team.work;

		assert.equal(logged[0].message, "Received unknown response type: undefined");
		assert.equal(logged[0].type, "protocol");
		assert.equal(logged[0].isNes, true);

		assert.equal(logged[1].message, "Received response for unknown request");
		assert.equal(logged[1].type, "protocol");
		assert.equal(logged[1].isNes, true);

		await client.disconnect();
		await server.stop();
	});

	it("#_onMessage - logs incoming message after timeout", async () => {
		const server = await createServerWithPlugin({}, {}, true);

		server.route({
			method: "POST",
			path: "/",
			handler: async (request) => {
				await Hoek.wait(200);
				return "hello";
			},
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port, { timeout: 20 });

		let logged;
		client.onError = (err) => {
			logged = err;
		};

		await client.connect();

		await assert.rejects(() => client.request("/"), "Request timed out");

		await new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve();
			}, 300);
		});

		// Message received after timeout
		assert.equal(logged.message, "Received response for unknown request");
		assert.equal(logged.type, "protocol");
		assert.equal(logged.isNes, true);

		await client.disconnect();
		await server.stop();
	});

	it("#_beat - disconnects when server fails to ping", async () => {
		const server = await createServerWithPlugin({ heartbeat: { interval: 20, timeout: 10 } });

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		client.onError = Hoek.ignore;

		const team = new Teamwork.Team({ meetings: 2 });

		client.onHeartbeatTimeout = (willReconnect) => {
			assert.true(willReconnect);
			team.attend();
		};

		client.onDisconnect = (willReconnect, log) => {
			assert.true(willReconnect);
			team.attend();
		};

		await client.connect();
		clearTimeout(server.plugins.nes._listener._heartbeat);

		await team.work;
		await client.disconnect();
		await server.stop();
	});

	it("#_beat - disconnects when server fails to ping (after a few pings)", async () => {
		const server = await createServerWithPlugin({ heartbeat: { interval: 20, timeout: 10 } });

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		client.onError = Hoek.ignore;

		const team = new Teamwork.Team();
		client.onDisconnect = (willReconnect, log) => {
			team.attend();
		};

		await client.connect();
		await Hoek.wait(50);
		clearTimeout(server.plugins.nes._listener._heartbeat);

		await team.work;
		await client.disconnect();
		await server.stop();
	});

	each(
		"terminates when receiving a ws.%s",
		async ({ dataset: method }) => {
			const server = await createServerWithPlugin({}, {}, true);

			server.route({
				method: "POST",
				path: "/",
				handler: async (request) => {
					request.server.plugins.nes._listener._sockets._forEach((socket) => {
						setTimeout(() => socket._ws[method](), 100);
					});

					return "hello";
				},
			});

			await server.start();
			const client = new Client("http://127.0.0.1:" + server.info.port);

			await client.connect();

			await client.request("/");

			await Hoek.wait(500);

			//@ts-ignore
			assert.null(client._ws); // null because _cleanup() in reconnect() method

			await client.disconnect();
			await server.stop();
		},
		["ping", "pong"],
	);
});
