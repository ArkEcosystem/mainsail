import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";

import { describe } from "../../test-framework";
import { http } from "./http";
import { sleep } from "./sleep";

describe("HTTP", ({ it, assert, beforeAll, afterAll, each }) => {
	let server: Hapi.Server;
	let serverURL: string;

	beforeAll(async () => {
		process.env.NOCK_OFF = true;

		server = Hapi.server({
			host: "localhost",
			port: 3000,
		});

		server.route({
			handler: (_, h) => h.response("success").type("application/json"),
			method: "GET",
			path: "/malformed",
		});

		server.route({
			handler: async () => {
				await sleep(2000);

				return {};
			},
			method: "GET",
			path: "/timeout",
		});

		server.route({
			handler: () => ({}),
			method: "GET",
			path: "/get",
		});

		server.route({
			handler: () => Boom.notFound(),
			method: "GET",
			path: "/status/404",
		});

		server.route({
			handler: () => ({}),
			method: "POST",
			path: "/post",
		});

		server.route({
			handler: (_, h) => h.response({}).code(201),
			method: "POST",
			path: "/status/201",
		});

		server.route({
			handler: () => ({}),
			method: "PUT",
			path: "/put",
		});

		server.route({
			handler: () => ({}),
			method: "PATCH",
			path: "/patch",
		});

		server.route({
			handler: () => ({}),
			method: "DELETE",
			path: "/delete",
		});

		server.route({
			handler: (_, h) => {
				const payload = "a".repeat(h.request.query["size"]);
				return h.response(payload).code(200);
			},
			method: "GET",
			path: "/payload",
		});

		await server.start();

		serverURL = server.info.uri;
	});

	afterAll(async () => {
		delete process.env.NOCK_OFF;
		server.stop();
	});

	it("#get - should send a request and receive status code 200", async () => {
		const { statusCode } = await http.get(`${serverURL}/get?key=value`);

		assert.equal(statusCode, 200);
	});

	it("#get - should send a request and receive status code 404", async () => {
		await assert.rejects(() => http.get(`${serverURL}/status/404`), "Not Found");
	});

	it("#get - should send a request and throw when malformed JSON is received", async () => {
		await assert.rejects(
			() => http.get(`${serverURL}/malformed`),
			"Unexpected token 's', \"success\" is not valid JSON",
		);
	});

	it("#get - should send a request and throw when the request times out", async () => {
		await assert.rejects(() => http.get(`${serverURL}/timeout`, { timeout: 1000 }), "socket hang up");
	});

	it("#head - should send a request and receive status code 200", async () => {
		const { statusCode } = await http.head(`${serverURL}/get?key=value`);

		assert.equal(statusCode, 200);
	});

	it("#head - should send a request and receive status code 404", async () => {
		await assert.rejects(() => http.head(`${serverURL}/status/404`), "Not Found");
	});

	// HTTP GET will throw error because body is malformed
	it("#head - should send a request and receive status code 200 because malformed JSON is not received in body", async () => {
		const { statusCode } = await http.head(`${serverURL}/malformed`);

		assert.equal(statusCode, 200);
	});

	it("#head - should send a request and throw when the request times out", async () => {
		await assert.rejects(() => http.head(`${serverURL}/timeout`, { timeout: 1000 }), "socket hang up");
	});

	it("#post - should send a request and receive status code 200", async () => {
		const { statusCode } = await http.post(`${serverURL}/post`);

		assert.equal(statusCode, 200);
	});

	it("#post - should send a request and receive status code 201", async () => {
		const { statusCode } = await http.post(`${serverURL}/status/201`);

		assert.equal(statusCode, 201);
	});

	it("#post - should send a request with a body and receive status code 200", async () => {
		const { statusCode } = await http.post(`${serverURL}/post`, { body: { key: "value" } });

		assert.equal(statusCode, 200);
	});

	it("#put - should send a request and receive status code 200", async () => {
		const { statusCode } = await http.put(`${serverURL}/put`);

		assert.equal(statusCode, 200);
	});

	it("#patch - should send a request and receive status code 200", async () => {
		const { statusCode } = await http.patch(`${serverURL}/patch`);

		assert.equal(statusCode, 200);
	});

	it("#delete - should send a request and receive status code 200", async () => {
		const { statusCode } = await http.delete(`${serverURL}/delete`);

		assert.equal(statusCode, 200);
	});

	each(
		"get - should respect maxContentLength",
		async ({
			dataset: { responseSize, maxContentLength, success },
		}: {
			dataset: { responseSize: number; maxContentLength?: number; success: boolean };
		}) => {
			try {
				const { statusCode, data } = await http.get(`${serverURL}/payload?size=${responseSize}`, {
					maxContentLength,
				});

				assert.true(success);
				assert.equal(statusCode, 200);
				assert.equal(data, "a".repeat(responseSize));
			} catch (ex) {
				assert.false(success);
				assert.equal(ex.message, "response too large");
			}
		},
		[
			{ responseSize: 0, success: true },
			{ responseSize: 100, success: true },
			{ maxContentLength: 0, responseSize: 0, success: true },
			{ maxContentLength: 0, responseSize: 10, success: false },
			{ maxContentLength: 100, responseSize: 100, success: true },
			{ maxContentLength: 100, responseSize: 101, success: false },
			{ maxContentLength: 999, responseSize: 500, success: true },
			{ maxContentLength: 999, responseSize: 500000, success: false },
			{ maxContentLength: 500000, responseSize: 400000, success: true },
		],
	);
});
