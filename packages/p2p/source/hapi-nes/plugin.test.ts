import { describe } from "../../../core-test-framework";

import * as Hapi from "@hapi/hapi";
import * as Hoek from "@hapi/hoek";
import * as Teamwork from "@hapi/teamwork";
import { Client } from "./client";
import { plugin } from "./plugin";
import { Socket } from "./socket";
import { parseNesMessage } from "./utils";

describe("Plugin", ({ it, spy, beforeEach, assert, nock, each }) => {
	beforeEach(() => {
		nock.enableNetConnect();
	});

	it("#register - adds websocket support", async () => {
		const server = Hapi.server();
		await server.register({ plugin });

		const bufHello = Buffer.from("hello");
		server.route({
			method: "POST",
			path: "/",
			handler: () => bufHello,
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

	it("#register - calls onConnection callback", async () => {
		const server = Hapi.server();
		const team = new Teamwork.Team();
		const onConnection = (ws) => {
			assert.defined(ws);
			client.disconnect();
			team.attend();
		};

		await server.register({ plugin: plugin, options: { onConnection } });

		server.route({
			method: "POST",
			path: "/",
			handler: () => "hello",
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();
		await team.work;
		await server.stop();
	});

	it("#register - calls onDisconnection callback", async () => {
		const server = Hapi.server();
		const team = new Teamwork.Team();
		const onDisconnection = (ws) => {
			assert.defined(ws);
			client.disconnect();
			team.attend();
		};

		await server.register({ plugin: plugin, options: { onDisconnection } });

		server.route({
			method: "POST",
			path: "/",
			handler: () => "hello",
		});

		await server.start();
		const client = new Client("http://127.0.0.1:" + server.info.port);
		await client.connect();
		await client.disconnect();
		await team.work;
		await server.stop();
	});
});
