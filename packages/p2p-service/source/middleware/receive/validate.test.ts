import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { CloseReason, RequestError } from "@mainsail/p2p-websocket";
import { describe } from "@mainsail/test-runner";

import { ValidateReceiveMiddleware } from "./validate";

describe<{
	middleware: ValidateReceiveMiddleware;
	validator: any;
}>("ValidateReceiveMiddleware", ({ it, assert, beforeEach, spy }) => {
	const schema = { request: { type: "object" }, response: { type: "string" } };
	const data = { headers: {} };

	beforeEach((context) => {
		context.validator = { validate: () => ({ error: undefined }) };

		const app = new Application();
		app.bind(Identifiers.Cryptography.Validator).toConstantValue(context.validator);

		context.middleware = app.resolve(ValidateReceiveMiddleware);
	});

	it("should check the decoded request against the request schema of the route", async ({
		middleware,
		validator,
	}) => {
		const validate = spy(validator, "validate");

		await middleware.before({ request: { data }, route: { path: "getPeers", schema } } as any);

		validate.calledOnce();
		validate.calledWith(schema.request, data);
	});

	it("should answer 400 and close the connection as a protocol error when the request does not fit", async ({
		middleware,
		validator,
	}) => {
		validator.validate = () => ({ error: "data must be object" });

		let thrown: unknown;
		try {
			await middleware.before({ request: { data }, route: { path: "getPeers", schema } } as any);
		} catch (error) {
			thrown = error;
		}

		assert.instance(thrown, RequestError);
		assert.equal((thrown as RequestError).statusCode, 400);
		assert.equal((thrown as RequestError).closeReason, CloseReason.ProtocolError);
		assert.equal((thrown as RequestError).message, "Invalid getPeers request: data must be object");
	});

	it("should not check a route without a schema, which is not one of ours", async ({ middleware, validator }) => {
		const validate = spy(validator, "validate");

		await middleware.before({ request: { data }, route: { path: "foreign" } } as any);

		validate.neverCalled();
	});
});
