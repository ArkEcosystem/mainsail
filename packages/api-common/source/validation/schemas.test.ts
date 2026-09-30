import { describe } from "@mainsail/test-runner";
import { Ajv } from "ajv";

import { jsonRpcPayloadSchema, jsonRpcResponseSchema } from "./schemas";

const makeRequest = (id: number) => ({ id, jsonrpc: "2.0", method: "eth_call", params: [] });

describe<{
	ajv: Ajv;
}>("JSON-RPC schemas", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.ajv = new Ajv();
		context.ajv.addSchema(jsonRpcPayloadSchema);
		context.ajv.addSchema(jsonRpcResponseSchema);
	});

	it("accepts a single request", ({ ajv }) => {
		assert.true(ajv.validate("jsonRpcPayload", makeRequest(1)));
	});

	it("accepts a batch of up to 100 requests", ({ ajv }) => {
		assert.true(
			ajv.validate(
				"jsonRpcPayload",
				Array.from({ length: 100 }, (_, index) => makeRequest(index)),
			),
		);
	});

	it("rejects a batch above the amplification cap", ({ ajv }) => {
		assert.false(
			ajv.validate(
				"jsonRpcPayload",
				Array.from({ length: 101 }, (_, index) => makeRequest(index)),
			),
		);
	});

	it("rejects an empty batch", ({ ajv }) => {
		assert.false(ajv.validate("jsonRpcPayload", []));
	});

	it("rejects a batch containing a malformed request", ({ ajv }) => {
		assert.false(ajv.validate("jsonRpcPayload", [makeRequest(1), { id: 2, jsonrpc: "2.0" }]));
	});

	it("accepts result and error responses", ({ ajv }) => {
		assert.true(ajv.validate("jsonRpcResponse", { id: 1, jsonrpc: "2.0", result: "0x" }));
		assert.true(
			ajv.validate("jsonRpcResponse", {
				error: { code: -32_600, message: "Invalid request" },
				id: 1,
				jsonrpc: "2.0",
			}),
		);
		assert.false(ajv.validate("jsonRpcResponse", { id: 1, jsonrpc: "2.0" }));
	});
});
