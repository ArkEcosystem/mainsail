import { describe } from "@mainsail/test-runner";
import { Context, ServerHelper } from "../../../test/helpers/server";

describe<Context>("Whitelist", ({ beforeEach, afterEach, afterAll, it, assert }) => {
	const serverOptions = {
		host: "0.0.0.0",
		port: 4004,
		whitelist: ["127.0.0.1"],
	};

	beforeEach(async (context) => {
		ServerHelper.initApp(context);
	});

	afterEach(ServerHelper.dispose);

	afterAll(ServerHelper.cleanup);

	it("should GET all the webhooks if whitelisted", async (context) => {
		await ServerHelper.initServer(context, serverOptions);

		const response = await ServerHelper.request(context.server, "GET", "webhooks");

		assert.equal(response.status, 200);
		assert.array(response.body.data);
	});

	it("should GET error if not whitelisted", async (context) => {
		serverOptions.whitelist = ["128.0.0.1"];
		await ServerHelper.initServer(context, serverOptions);

		const response = await ServerHelper.request(context.server, "GET", "webhooks");

		assert.equal(response.status, 403);
	});

	it("should GET all the webhooks if the whitelist entry is not written in canonical form", async (context) => {
		await ServerHelper.initServer(context, {
			...serverOptions,
			whitelist: ["::ffff:127.0.0.1", "2001:0DB8:0000:0000:0000:0000:0000:0001"],
		});

		const from = async (remoteAddress: string) =>
			(await context.server.inject({ method: "GET", remoteAddress, url: "http://localhost:4004/api/webhooks" }))
				.statusCode;

		assert.equal(await from("127.0.0.1"), 200);
		assert.equal(await from("2001:db8::1"), 200);
		assert.equal(await from("2001:db8::2"), 403);
	});

	it("should GET error for an IPv4-compatible IPv6 client that embeds a whitelisted IPv4 address", async (context) => {
		await ServerHelper.initServer(context, { ...serverOptions, whitelist: ["127.0.0.1"] });

		const response = await context.server.inject({
			method: "GET",
			remoteAddress: "::127.0.0.1",
			url: "http://localhost:4004/api/webhooks",
		});

		assert.equal(response.statusCode, 403);
	});
});
