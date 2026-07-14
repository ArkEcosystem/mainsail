import { Enums, Identifiers } from "@mainsail/constants";
import { RpcError } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Processor } from "./processor";

describe<{
	app: Application;
	subject: Processor;
	validator: any;
}>("RCP Processor", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.validator = {
			addSchema() {},
			validate(schemaId: string, data: unknown) {
				// eslint-disable-next-line unicorn/no-null
				return { error: null, value: data };
			},
		};

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Validator).toConstantValue(context.validator);

		context.subject = context.app.resolve(Processor);
	});

	it("registerAction should store action and add its schema", ({ subject, validator }) => {
		const addSchema = spy(validator, "addSchema");
		const schema = { $id: "s" };
		const action = { handle: async () => "ok", name: "m", schema };

		subject.registerAction(action as any);

		addSchema.calledOnce();
		addSchema.calledWith(schema);
	});

	it("process should return InvalidRequest when payload is invalid", async ({ subject, validator }) => {
		validator.validate = (schemaId: string) =>
			schemaId === "jsonRpcPayload" ? { error: { message: "bad" } } : { error: undefined };

		const result = await subject.process({ payload: { id: 5 } } as any);

		assert.equal(result, {
			error: {
				code: Enums.Api.RcpErrorCode.InvalidRequest,
				data: undefined,
				message: "Invalid request",
			},
			id: 5,
			jsonrpc: "2.0",
		});
	});

	it("process should handle a single valid request", async ({ subject }) => {
		subject.registerAction({
			handle: async () => "RESULT",
			name: "m",
			schema: { $id: "s" },
		} as any);

		const result = await subject.process({
			payload: { id: 1, jsonrpc: "2.0", method: "m", params: [] },
		} as any);

		assert.equal(result, { id: 1, jsonrpc: "2.0", result: "RESULT" });
	});

	it("process should validate missing params as an empty array", async ({ subject, validator }) => {
		const validated: unknown[][] = [];
		validator.validate = (schemaId: string, data: unknown) => {
			validated.push([schemaId, data]);
			// eslint-disable-next-line unicorn/no-null
			return { error: null, value: data };
		};

		subject.registerAction({
			handle: async () => "RESULT",
			name: "m",
			schema: { $id: "s" },
		} as any);

		const result = await subject.process({
			payload: { id: 1, jsonrpc: "2.0", method: "m" },
		} as any);

		assert.equal(result, { id: 1, jsonrpc: "2.0", result: "RESULT" });
		assert.true(validated.some(([schemaId, data]) => schemaId === "s" && Array.isArray(data) && data.length === 0));
	});

	it("process should handle a batch/array payload", async ({ subject }) => {
		subject.registerAction({
			handle: async (parameters: any[]) => `R-${parameters[0]}`,
			name: "m",
			schema: { $id: undefined },
		} as any);

		const result = await subject.process({
			payload: [
				{ id: 1, jsonrpc: "2.0", method: "m", params: ["a"] },
				{ id: 2, jsonrpc: "2.0", method: "m", params: ["b"] },
			],
		} as any);

		assert.equal(result, [
			{ id: 1, jsonrpc: "2.0", result: "R-a" },
			{ id: 2, jsonrpc: "2.0", result: "R-b" },
		]);
	});

	it("process should return MethodNotFound for unknown method", async ({ subject }) => {
		const result = await subject.process({
			payload: { id: 3, jsonrpc: "2.0", method: "unknown", params: [] },
		} as any);

		assert.equal(result, {
			error: {
				code: Enums.Api.RcpErrorCode.MethodNotFound,
				data: undefined,
				message: "Method not found",
			},
			id: 3,
			jsonrpc: "2.0",
		});
	});

	it("process should return InvalidParameters when params validation fails", async ({ subject, validator }) => {
		validator.validate = (schemaId: string) =>
			schemaId === "jsonRpcPayload" ? { error: undefined } : { error: { message: "bad params" } };

		subject.registerAction({
			handle: async () => "RESULT",
			name: "m",
			schema: { $id: "paramsSchema" },
		} as any);

		const result = await subject.process({
			payload: { id: 4, jsonrpc: "2.0", method: "m", params: [] },
		} as any);

		assert.equal(result, {
			error: {
				code: Enums.Api.RcpErrorCode.InvalidParameters,
				data: undefined,
				message: "Invalid params",
			},
			id: 4,
			jsonrpc: "2.0",
		});
	});

	it("process should skip params validation when schema.$id is undefined", async ({ subject, validator }) => {
		// validate would report an error, but $id undefined means params validation is skipped
		validator.validate = (schemaId: string) =>
			schemaId === "jsonRpcPayload" ? { error: undefined } : { error: { message: "bad params" } };

		subject.registerAction({
			handle: async () => "RESULT",
			name: "m",
			schema: { $id: undefined },
		} as any);

		const result = await subject.process({
			payload: { id: 8, jsonrpc: "2.0", method: "m", params: [] },
		} as any);

		assert.equal(result, { id: 8, jsonrpc: "2.0", result: "RESULT" });
	});

	it("process should map a thrown RpcError to its code, message and data", async ({ subject }) => {
		subject.registerAction({
			handle: async () => {
				throw new RpcError("custom failure", "err-data", Enums.Api.RcpErrorCode.RpcServerError);
			},
			name: "m",
			schema: { $id: "s" },
		} as any);

		const result = await subject.process({
			payload: { id: 9, jsonrpc: "2.0", method: "m", params: [] },
		} as any);

		assert.equal(result, {
			error: {
				code: Enums.Api.RcpErrorCode.RpcServerError,
				data: "err-data",
				message: "custom failure",
			},
			id: 9,
			jsonrpc: "2.0",
		});
	});

	it("process should map a generic thrown Error to InternalError", async ({ subject }) => {
		subject.registerAction({
			handle: async () => {
				throw new Error("kaboom");
			},
			name: "m",
			schema: { $id: "s" },
		} as any);

		const result = await subject.process({
			payload: { id: 10, jsonrpc: "2.0", method: "m", params: [] },
		} as any);

		assert.equal(result, {
			error: {
				code: Enums.Api.RcpErrorCode.InternalError,
				data: undefined,
				message: "Internal error",
			},
			id: 10,
			jsonrpc: "2.0",
		});
	});
});
