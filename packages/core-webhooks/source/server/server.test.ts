import { Enums } from "@arkecosystem/core-kernel";
import { describe } from "@arkecosystem/core-test-framework";

import { Context, ServerHelper } from "../../test/helpers/server";

describe<Context>("Server", ({ beforeEach, afterEach, afterAll, it, assert }) => {
	const postData = {
		conditions: [
			{
				condition: "eq",
				key: "generatorPublicKey",
				value: "test-generator",
			},
			{
				condition: "gte",
				key: "fee",
				value: "123",
			},
		],
		enabled: true,
		event: Enums.BlockEvent.Forged,
		target: "https://httpbin.org/post",
	};

	const createWebhook = (server, data?: any) => ServerHelper.request(server, "POST", "webhooks", data || postData);

	beforeEach(async (context) => {
		ServerHelper.initApp(context);
		await ServerHelper.initServer(context, {
			http: {
				host: "0.0.0.0",
				port: 4004,
			},
		});
	});

	afterEach(ServerHelper.dispose);

	afterAll(ServerHelper.cleanup);

	it("should GET hello world", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: `http://localhost:4004/` });

		assert.equal(response.statusCode, 200);
		assert.equal(response.result.data, "Hello World!");
	});

	it("should GET all the webhooks", async ({ server }) => {
		await createWebhook(server);
		const response = await ServerHelper.request(server, "GET", "webhooks");

		assert.equal(response.status, 200);
		assert.array(response.body.data);
	});

	it("should POST a new webhook with a simple condition", async ({ server }) => {
		const response = await createWebhook(server);
		assert.equal(response.status, 201);
		assert.object(response.body.data);
	});

	it("should POST a new webhook with an empty array as condition", async ({ server }) => {
		const response = await createWebhook(server, {
			conditions: [],
			enabled: true,
			event: Enums.BlockEvent.Forged,
			target: "https://httpbin.org/post",
		});
		assert.equal(response.status, 201);
		assert.object(response.body.data);
	});

	it("should GET a webhook by the given id", async ({ server }) => {
		const { body } = await createWebhook(server);

		const response = await ServerHelper.request(server, "GET", `webhooks/${body.data.id}`);
		assert.equal(response.status, 200);
		assert.object(response.body.data);

		body.data.token = undefined;

		assert.equal(response.body.data, body.data);
	});

	it("should fail to GET a webhook by the given id", async ({ server }) => {
		assert.equal((await ServerHelper.request(server, "GET", `webhooks/123`)).status, 404);
	});

	it("should PUT a webhook by the given id", async ({ server }) => {
		const { body } = await createWebhook(server);

		assert.equal((await ServerHelper.request(server, "PUT", `webhooks/${body.data.id}`, postData)).status, 204);
	});

	it("should fail to PUT a webhook by the given id", async ({ server }) => {
		assert.equal((await ServerHelper.request(server, "PUT", `webhooks/123`, postData)).status, 404);
	});

	it("should DELETE a webhook by the given id", async ({ server }) => {
		const { body } = await createWebhook(server);

		assert.equal((await ServerHelper.request(server, "DELETE", `webhooks/${body.data.id}`)).status, 204);
	});

	it("should fail to DELETE a webhook by the given id", async ({ server }) => {
		assert.equal((await ServerHelper.request(server, "DELETE", `webhooks/123`)).status, 404);
	});
});
