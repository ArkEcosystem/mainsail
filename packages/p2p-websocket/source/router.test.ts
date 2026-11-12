import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import type { Route } from "./interfaces/index.js";

import { ReceiveCodecMiddleware } from "./middleware/index.js";
import { Router } from "./router.js";

const codec = {
	request: { deserialize: (payload: Buffer) => payload.toString(), serialize: (data: string) => Buffer.from(data) },
	response: { deserialize: (payload: Buffer) => payload.toString(), serialize: (data: string) => Buffer.from(data) },
};

const connection = { remoteAddress: "1.1.1.1" } as any;

describe<{
	router: Router;
}>("Router", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		const app = new Application();
		app.bind(Identifiers.P2P.WebSocket.Logger).toConstantValue({ debug: () => {} });
		app.bind(Identifiers.P2P.WebSocket.ReceiveMiddleware).to(ReceiveCodecMiddleware);

		context.router = app.resolve(Router);
		context.router.register({
			codec,
			handle: async (_, data: string) => `echo:${data}`,
			maxPayload: { request: 8, response: 64 },
			path: "echo",
		} as Route<unknown, unknown>);
	});

	it("should run a request through the codec and the route", async ({ router }) => {
		const response = await router.handle(connection, "echo", Buffer.from("hi"));

		assert.equal(response.statusCode, 200);
		assert.equal(response.payload.toString(), "echo:hi");
	});

	it("should answer 404 for an unknown path", async ({ router }) => {
		assert.equal((await router.handle(connection, "nope", Buffer.alloc(0))).statusCode, 404);
	});

	it("should answer 413 for a request over the route's limit without decoding it", async ({ router }) => {
		let decoded = false;
		codec.request.deserialize = (payload: Buffer) => {
			decoded = true;
			return payload.toString();
		};

		const response = await router.handle(connection, "echo", Buffer.alloc(9));

		assert.equal(response.statusCode, 413);
		assert.false(decoded);
	});

	it("should refuse a duplicate path", ({ router }) => {
		assert.throws(
			() =>
				router.register({
					codec,
					handle: async () => "",
					maxPayload: { request: 1, response: 1 },
					path: "echo",
				} as Route<unknown, unknown>),
			"Duplicate route: echo",
		);
	});
});
