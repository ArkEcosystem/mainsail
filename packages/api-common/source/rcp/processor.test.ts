import { Enums, Identifiers } from "@mainsail/constants";
import { RpcError } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { DEFAULT_BATCH_RESPONSE_MAX_SIZE, Processor } from "./processor";

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

	it("process should bound batch concurrency and preserve order", async ({ subject }) => {
		let inFlight = 0;
		let peak = 0;

		subject.registerAction({
			handle: async (parameters: any[]) => {
				inFlight++;
				peak = Math.max(peak, inFlight);
				await new Promise((resolve) => setImmediate(resolve));
				inFlight--;
				return `R-${parameters[0]}`;
			},
			name: "m",
			schema: { $id: undefined },
		} as any);

		const payload = Array.from({ length: 25 }, (_, index) => ({
			id: index,
			jsonrpc: "2.0",
			method: "m",
			params: [index],
		}));

		const result = (await subject.process({ payload } as any)) as any[];

		// never more than BATCH_CONCURRENCY (10) simulations in flight at once
		assert.true(peak <= 10);
		assert.equal(
			result,
			payload.map((request) => ({ id: request.id, jsonrpc: "2.0", result: `R-${request.id}` })),
		);
	});

	it("process should replace batch responses past the byte budget with ResponseTooLarge", async ({ subject }) => {
		const result = "a".repeat(Math.ceil(DEFAULT_BATCH_RESPONSE_MAX_SIZE / 4));
		subject.registerAction({ handle: async () => result, name: "big", schema: { $id: "s" } } as any);

		const responses = (await subject.process({
			payload: Array.from({ length: 6 }, (_, id) => ({ id, jsonrpc: "2.0", method: "big", params: [] })),
		} as any)) as any[];

		assert.length(responses, 6);
		assert.equal(
			responses.map((response) => response.result === result),
			[true, true, true, false, false, false],
		);
		for (const response of responses.slice(3)) {
			assert.equal(response.error, {
				code: Enums.Api.RcpErrorCode.ResponseTooLarge,
				data: undefined,
				message: "Response too large",
			});
		}
		assert.equal(
			responses.map(({ id }) => id),
			[0, 1, 2, 3, 4, 5],
		);
	});

	it("process should not run the batch groups after the byte budget is spent", async ({ subject }) => {
		const result = "a".repeat(Math.ceil(DEFAULT_BATCH_RESPONSE_MAX_SIZE / 8));
		let calls = 0;
		subject.registerAction({
			handle: async () => {
				calls++;
				return result;
			},
			name: "big",
			schema: { $id: "s" },
		} as any);

		const responses = (await subject.process({
			payload: Array.from({ length: 25 }, (_, id) => ({ id, jsonrpc: "2.0", method: "big", params: [] })),
		} as any)) as any[];

		assert.equal(calls, 10);
		assert.length(responses, 25);
		assert.equal(
			responses.filter((response) => response.error?.code === Enums.Api.RcpErrorCode.ResponseTooLarge).length,
			18,
		);
	});

	it("process should apply the configured batch response max size", async ({ subject }) => {
		subject.registerAction({ handle: async () => "a".repeat(100), name: "big", schema: { $id: "s" } } as any);

		const responses = (await subject.setBatchResponseMaxSize(300).process({
			payload: Array.from({ length: 3 }, (_, id) => ({ id, jsonrpc: "2.0", method: "big", params: [] })),
		} as any)) as any[];

		assert.equal(
			responses.map((response) => response.error?.code),
			[undefined, undefined, Enums.Api.RcpErrorCode.ResponseTooLarge],
		);
	});

	it("process should count only the result and error bytes of batch responses", async ({ subject }) => {
		subject.registerAction({ handle: async () => "a".repeat(100), name: "big", schema: { $id: "s" } } as any);
		const payload = [
			{ id: 0, jsonrpc: "2.0", method: "big", params: [] },
			{ id: 1, jsonrpc: "2.0", method: "unknown", params: [] },
		];

		const fitting = (await subject.setBatchResponseMaxSize(102 + 44).process({ payload } as any)) as any[];
		const exceeding = (await subject.setBatchResponseMaxSize(102 + 43).process({ payload } as any)) as any[];

		assert.equal(
			fitting.map((response) => response.error?.code),
			[undefined, Enums.Api.RcpErrorCode.MethodNotFound],
		);
		assert.equal(
			exceeding.map((response) => response.error?.code),
			[undefined, Enums.Api.RcpErrorCode.ResponseTooLarge],
		);
	});

	it("process should count batch response bytes as utf-8", async ({ subject }) => {
		subject.registerAction({ handle: async () => "é".repeat(50), name: "big", schema: { $id: "s" } } as any);

		const responses = (await subject.setBatchResponseMaxSize(203).process({
			payload: Array.from({ length: 2 }, (_, id) => ({ id, jsonrpc: "2.0", method: "big", params: [] })),
		} as any)) as any[];

		assert.equal(
			responses.map((response) => response.error?.code),
			[undefined, Enums.Api.RcpErrorCode.ResponseTooLarge],
		);
	});

	it("process should not count a batch response without a result", async ({ subject }) => {
		subject.registerAction({ handle: async () => undefined, name: "empty", schema: { $id: "s" } } as any);

		const responses = (await subject.setBatchResponseMaxSize(1).process({
			payload: Array.from({ length: 3 }, (_, id) => ({ id, jsonrpc: "2.0", method: "empty", params: [] })),
		} as any)) as any[];

		assert.true(responses.every((response) => response.error === undefined));
	});

	it("process should not budget batch responses when the max size is 0", async ({ subject }) => {
		const result = "a".repeat(Math.ceil(DEFAULT_BATCH_RESPONSE_MAX_SIZE / 4));
		subject.registerAction({ handle: async () => result, name: "big", schema: { $id: "s" } } as any);

		const responses = (await subject.setBatchResponseMaxSize(0).process({
			payload: Array.from({ length: 6 }, (_, id) => ({ id, jsonrpc: "2.0", method: "big", params: [] })),
		} as any)) as any[];

		assert.true(responses.every((response) => response.result === result));
	});

	it("process should not budget a single request", async ({ subject }) => {
		const result = "a".repeat(DEFAULT_BATCH_RESPONSE_MAX_SIZE + 1);
		subject.registerAction({ handle: async () => result, name: "big", schema: { $id: "s" } } as any);

		const response = (await subject.process({
			payload: { id: 1, jsonrpc: "2.0", method: "big", params: [] },
		} as any)) as any;

		assert.equal(response.result, result);
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
