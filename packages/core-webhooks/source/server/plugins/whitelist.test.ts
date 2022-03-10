import { Context, ServerHelper } from "../../../test/helpers/server";
import { describe } from "../../../../core-test-framework";

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
});
