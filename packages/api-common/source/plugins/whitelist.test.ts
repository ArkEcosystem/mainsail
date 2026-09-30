import { Server } from "@hapi/hapi";
import { describe } from "@mainsail/test-runner";

import { whitelist } from "./whitelist";

const buildServer = async (options: { whitelist?: string[]; trustProxy?: boolean }): Promise<Server> => {
	const server = new Server();

	await server.register({ plugin: whitelist, options: options as any });

	server.route({
		handler: () => "ok",
		method: "GET",
		path: "/",
	});

	return server;
};

describe<{}>("Whitelist", ({ it, assert }) => {
	it("should allow a request from a whitelisted IP", async () => {
		const server = await buildServer({ trustProxy: false, whitelist: ["127.0.0.1", "187.166.*"] });

		const response = await server.inject({ method: "GET", remoteAddress: "127.0.0.1", url: "/" });

		assert.is(response.statusCode, 200);
		assert.is(response.result, "ok");
	});

	it("should allow a request matching a glob whitelist pattern", async () => {
		const server = await buildServer({ trustProxy: false, whitelist: ["127.0.0.1", "187.166.*"] });

		const response = await server.inject({ method: "GET", remoteAddress: "187.166.55.10", url: "/" });

		assert.is(response.statusCode, 200);
	});

	it("should forbid a request from an IP not in the whitelist", async () => {
		const server = await buildServer({ trustProxy: false, whitelist: ["127.0.0.1", "187.166.*"] });

		const response = await server.inject({ method: "GET", remoteAddress: "10.0.0.1", url: "/" });

		assert.is(response.statusCode, 403);
	});

	it("should allow all requests when whitelist option is falsy", async () => {
		const server = await buildServer({ trustProxy: false });

		const response = await server.inject({ method: "GET", remoteAddress: "10.0.0.1", url: "/" });

		assert.is(response.statusCode, 200);
		assert.is(response.result, "ok");
	});

	it("should allow a forwarded IP when trustProxy is enabled", async () => {
		const server = await buildServer({ trustProxy: true, whitelist: ["127.0.0.1"] });

		const response = await server.inject({
			headers: { "x-forwarded-for": "127.0.0.1" },
			method: "GET",
			remoteAddress: "10.0.0.1",
			url: "/",
		});

		assert.is(response.statusCode, 200);
	});

	it("should forbid a forwarded IP not in the whitelist when trustProxy is enabled", async () => {
		const server = await buildServer({ trustProxy: true, whitelist: ["127.0.0.1"] });

		const response = await server.inject({
			headers: { "x-forwarded-for": "10.0.0.1" },
			method: "GET",
			remoteAddress: "127.0.0.1",
			url: "/",
		});

		assert.is(response.statusCode, 403);
	});
});
