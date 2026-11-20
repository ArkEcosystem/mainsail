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
	maxConcurrentRequests: 2,
	maxPayload: { request: 64, response: 8 },
	maxQueuedRequests: 1,
	path: "echo",
};

describe<{
	sender: Sender;
	connection: any;
	calls: string[];
}>("Sender", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.calls = [];

		const app = new Application();
		app.bind(Identifiers.P2P.WebSocket.SendMiddleware).to(SendCodecMiddleware);
		// A second step, bound after the codec like the steps of other packages; it records when it runs.
		app.bind(Identifiers.P2P.WebSocket.SendMiddleware).toConstantValue({
			after: async () => void context.calls.push("after"),
			before: async () => void context.calls.push("before"),
			finally: async ({ response }: { response: { statusCode: number } }) =>
				void context.calls.push(`finally:${response.statusCode}`),
		});

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

	it("should pass the options on to the connection", async ({ sender, connection }) => {
		let received: unknown;
		connection.request = async (_: string, payload: Buffer, options: unknown) => {
			received = options;
			return { payload: Buffer.from(`echo:${payload}`), statusCode: 200 };
		};

		await sender.send(connection, route, "hi", { timeout: 123 });

		assert.equal(received, { timeout: 123 });
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

	it("should run the finally step after a successful request", async ({ sender, connection, calls }) => {
		await sender.send(connection, route, "hi");

		assert.equal(calls, ["before", "after", "finally:200"]);
	});

	it("should run the finally step when the peer answers with an error", async ({ sender, connection, calls }) => {
		connection.request = async () => ({ payload: Buffer.alloc(0), statusCode: 413 });

		await assert.rejects(() => sender.send(connection, route, "hi"));

		assert.equal(calls, ["before", "finally:413"]);
	});

	it("should run the finally step when no response arrives", async ({ sender, connection, calls }) => {
		connection.request = async () => {
			throw new Error("timed out");
		};

		await assert.rejects(() => sender.send(connection, route, "hi"), "timed out");

		assert.equal(calls, ["before", "finally:0"]);
	});
});
