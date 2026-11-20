import { describe } from "@mainsail/test-runner";

import type { ReceiveContext } from "../../interfaces/index.js";

import { CloseReason } from "../../enums.js";
import { RequestLimitMiddleware } from "./request-limit.js";

const makeConnection = (ip: string): any => {
	const connection: any = { onClose: (listener: () => void) => (connection.close = listener), remoteAddress: ip };
	return connection;
};

const context = (connection: any, path: string, maxConcurrentRequests = 2): ReceiveContext =>
	({
		connection,
		request: { payload: Buffer.alloc(0) },
		response: {},
		route: { maxConcurrentRequests, path },
	}) as any;

describe<{
	limiter: RequestLimitMiddleware;
}>("RequestLimitMiddleware", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.limiter = new RequestLimitMiddleware();
	});

	it("should let a peer have up to maxConcurrentRequests requests per route and answer 429 beyond", async ({
		limiter,
	}) => {
		const connection = makeConnection("1.1.1.1");

		await limiter.before(context(connection, "echo"));
		await limiter.before(context(connection, "echo"));

		const error = await limiter.before(context(connection, "echo")).catch((error) => error);
		assert.equal(error.statusCode, 429);
		assert.equal(error.closeReason, CloseReason.ProtocolError);

		// Another route and another peer have their own counts.
		await limiter.before(context(connection, "other"));
		await limiter.before(context(makeConnection("2.2.2.2"), "echo"));
	});

	it("should release a slot when the request is done", async ({ limiter }) => {
		const connection = makeConnection("1.1.1.1");
		const first = context(connection, "echo");

		await limiter.before(first);
		await limiter.before(context(connection, "echo"));
		await limiter.finally(first);

		await limiter.before(context(connection, "echo"));
		const error = await limiter.before(context(connection, "echo")).catch((error) => error);
		assert.equal(error.statusCode, 429);
	});

	it("should forget a connection when it closes", async ({ limiter }) => {
		const connection = makeConnection("1.1.1.1");

		await limiter.before(context(connection, "echo"));
		await limiter.before(context(connection, "echo"));
		connection.close();

		await limiter.before(context(connection, "echo"));
	});
});
