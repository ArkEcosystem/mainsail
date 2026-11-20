import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { RequestError } from "@mainsail/p2p-websocket";
import { describe } from "@mainsail/test-runner";

import { ValidateSendMiddleware } from "./validate";

describe<{
	middleware: ValidateSendMiddleware;
	validator: any;
}>("ValidateSendMiddleware", ({ it, assert, beforeEach, spy }) => {
	const schema = { request: { type: "object" }, response: { type: "object" } };
	const data = { peers: [] };
	const connection = { remoteAddress: "1.2.3.4" };

	beforeEach((context) => {
		context.validator = { validate: () => ({ error: undefined }) };

		const app = new Application();
		app.bind(Identifiers.Cryptography.Validator).toConstantValue(context.validator);

		context.middleware = app.resolve(ValidateSendMiddleware);
	});

	it("should check the decoded response against the response schema of the route", async ({
		middleware,
		validator,
	}) => {
		const validate = spy(validator, "validate");

		await middleware.after({ connection, response: { data }, route: { path: "getPeers", schema } } as any);

		validate.calledOnce();
		validate.calledWith(schema.response, data);
	});

	it("should fail the request with a plain error when the response does not fit", async ({
		middleware,
		validator,
	}) => {
		validator.validate = () => ({ error: "data must have required property 'headers'" });

		let thrown: unknown;
		try {
			await middleware.after({ connection, response: { data }, route: { path: "getPeers", schema } } as any);
		} catch (error) {
			thrown = error;
		}

		// Not a RequestError or a ConnectionError: the callers ban for everything that is not a failed connection.
		assert.instance(thrown, Error);
		assert.false(thrown instanceof RequestError);
		assert.equal(
			(thrown as Error).message,
			"Invalid getPeers response from 1.2.3.4: data must have required property 'headers'",
		);
	});

	it("should not check a route without a schema, which is not one of ours", async ({ middleware, validator }) => {
		const validate = spy(validator, "validate");

		await middleware.after({ connection, response: { data }, route: { path: "foreign" } } as any);

		validate.neverCalled();
	});
});
