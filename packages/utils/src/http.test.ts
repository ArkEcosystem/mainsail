import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";

import { http } from "./http";
import { sleep } from "./sleep";

let server: Hapi.Server;
let serverURL: string;

beforeAll(async () => {
	server = Hapi.server({
		port: 3000,
		host: "localhost",
	});

	server.route({
		method: "GET",
		path: "/malformed",
		handler: (_, h) => {
			return h.response("success").type("application/json");
		},
	});

	server.route({
		method: "GET",
		path: "/timeout",
		handler: async () => {
			await sleep(2000);

			return {};
		},
	});

	server.route({
		method: "GET",
		path: "/get",
		handler: () => {
			return {};
		},
	});

	server.route({
		method: "GET",
		path: "/status/404",
		handler: () => {
			return Boom.notFound();
		},
	});

	server.route({
		method: "POST",
		path: "/post",
		handler: () => {
			return {};
		},
	});

	server.route({
		method: "POST",
		path: "/status/201",
		handler: (_, h) => {
			return h.response({}).code(201);
		},
	});

	server.route({
		method: "PUT",
		path: "/put",
		handler: () => {
			return {};
		},
	});

	server.route({
		method: "PATCH",
		path: "/patch",
		handler: () => {
			return {};
		},
	});

	server.route({
		method: "DELETE",
		path: "/delete",
		handler: () => {
			return {};
		},
	});

	await server.start();

	serverURL = server.info.uri;
});

afterAll(async () => server.stop());

describe("HTTP", () => {
	describe("#get", () => {
		it("should send a request and receive status code 200", async () => {
			const { statusCode } = await http.get(`${serverURL}/get?key=value`);

			expect(statusCode).toBe(200);
		});

		it("should send a request and receive status code 404", async () => {
			await expect(http.get(`${serverURL}/status/404`)).rejects.toThrow("Not Found");
		});

		it("should send a request and throw when malformed JSON is received", async () => {
			await expect(http.get(`${serverURL}/malformed`)).rejects.toThrow(
				"Unexpected token s in JSON at position 0",
			);
		});

		it("should send a request and throw when the request times out", async () => {
			await expect(http.get(`${serverURL}/timeout`, { timeout: 1000 })).rejects.toThrow("socket hang up");
		});
	});

	describe("#head", () => {
		it("should send a request and receive status code 200", async () => {
			const { statusCode } = await http.head(`${serverURL}/get?key=value`);

			expect(statusCode).toBe(200);
		});

		it("should send a request and receive status code 404", async () => {
			await expect(http.head(`${serverURL}/status/404`)).rejects.toThrow("Not Found");
		});

		// HTTP GET will throw error because body is malformed
		it("should send a request and receive status code 200 because malformed JSON is not received in body", async () => {
			const { statusCode } = await http.head(`${serverURL}/malformed`);

			expect(statusCode).toBe(200);
		});

		it("should send a request and throw when the request times out", async () => {
			await expect(http.head(`${serverURL}/timeout`, { timeout: 1000 })).rejects.toThrow("socket hang up");
		});
	});

	describe("#post", () => {
		it("should send a request and receive status code 200", async () => {
			const { statusCode } = await http.post(`${serverURL}/post`);

			expect(statusCode).toBe(200);
		});

		it("should send a request and receive status code 201", async () => {
			const { statusCode } = await http.post(`${serverURL}/status/201`);

			expect(statusCode).toBe(201);
		});

		it("should send a request with a body and receive status code 200", async () => {
			const { statusCode } = await http.post(`${serverURL}/post`, { body: { key: "value" } });

			expect(statusCode).toBe(200);
		});
	});

	describe("#put", () => {
		it("should send a request and receive status code 200", async () => {
			const { statusCode } = await http.put(`${serverURL}/put`);

			expect(statusCode).toBe(200);
		});
	});

	describe("#patch", () => {
		it("should send a request and receive status code 200", async () => {
			const { statusCode } = await http.patch(`${serverURL}/patch`);

			expect(statusCode).toBe(200);
		});
	});

	describe("#delete", () => {
		it("should send a request and receive status code 200", async () => {
			const { statusCode } = await http.delete(`${serverURL}/delete`);

			expect(statusCode).toBe(200);
		});
	});
});
