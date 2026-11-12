import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import type { RouteDefinition } from "./interfaces/index.js";

import { SendCodecMiddleware } from "./middleware/index.js";
import { Sender } from "./sender.js";

const route: RouteDefinition<string, string> = {
	codec: {
		request: {
			deserialize: (payload: Buffer) => payload.toString(),
			serialize: (data: string) => Buffer.from(data),
		},
		response: {
			deserialize: (payload: Buffer) => payload.toString(),
			serialize: (data: string) => Buffer.from(data),
		},
	},
	maxPayload: { request: 64, response: 8 },
	path: "echo",
};

describe<{
	sender: Sender;
	connection: any;
}>("Sender", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		const app = new Application();
		app.bind(Identifiers.P2P.WebSocket.SendMiddleware).to(SendCodecMiddleware);

		context.sender = app.resolve(Sender);
		context.connection = {
			remoteAddress: "1.1.1.1",
			request: async (_: string, payload: Buffer) => ({
				payload: Buffer.from(`echo:${payload}`),
				statusCode: 200,
			}),
		};
	});

	it("should encode the request and decode the response", async ({ sender, connection }) => {
		assert.equal(await sender.send(connection, route, "hi"), "echo:hi");
	});

	it("should fail on a non-200 answer", async ({ sender, connection }) => {
		connection.request = async () => ({ payload: Buffer.alloc(0), statusCode: 413 });

		await assert.rejects(() => sender.send(connection, route, "hi"), "echo to 1.1.1.1 answered 413");
	});

	it("should fail on a response over the route's limit", async ({ sender, connection }) => {
		connection.request = async () => ({ payload: Buffer.alloc(9), statusCode: 200 });

		await assert.rejects(
			() => sender.send(connection, route, "hi"),
			"echo response from 1.1.1.1 is 9 bytes, more than the 8 allowed",
		);
	});
});
