import { Enums } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { errorMessageMap, getRcpId, prepareRcpError } from "./utilities";

describe<{}>("RCP Utilities", ({ it, assert }) => {
	describe("getRcpId", () => {
		it("should return numeric id", () => {
			assert.is(getRcpId({ payload: { id: 42 } } as any), 42);
		});

		it("should return string id", () => {
			assert.is(getRcpId({ payload: { id: "abc" } } as any), "abc");
		});

		it("should return null when payload is missing", () => {
			assert.null(getRcpId({ payload: undefined } as any));
		});

		it("should return null when payload is not an object", () => {
			assert.null(getRcpId({ payload: "string-payload" } as any));
		});

		it("should return null when id is of wrong type", () => {
			assert.null(getRcpId({ payload: { id: { nested: true } } } as any));
		});

		it("should return null when id is missing", () => {
			assert.null(getRcpId({ payload: {} } as any));
		});
	});

	describe("errorMessageMap", () => {
		it("should map each code to its message", () => {
			assert.is(errorMessageMap[Enums.Api.RcpErrorCode.InternalError], "Internal error");
			assert.is(errorMessageMap[Enums.Api.RcpErrorCode.InvalidParameters], "Invalid params");
			assert.is(errorMessageMap[Enums.Api.RcpErrorCode.InvalidRequest], "Invalid request");
			assert.is(errorMessageMap[Enums.Api.RcpErrorCode.MethodNotFound], "Method not found");
			assert.is(errorMessageMap[Enums.Api.RcpErrorCode.ParseError], "Parse error");
		});
	});

	describe("prepareRcpError", () => {
		it("should use default message from map when message omitted", () => {
			const result = prepareRcpError(1, Enums.Api.RcpErrorCode.InvalidRequest);

			assert.equal(result, {
				error: {
					code: Enums.Api.RcpErrorCode.InvalidRequest,
					data: undefined,
					message: "Invalid request",
				},
				id: 1,
				jsonrpc: "2.0",
			});
		});

		it("should pass through custom message and data", () => {
			const result = prepareRcpError(7, Enums.Api.RcpErrorCode.InternalError, "boom", "extra-data");

			assert.equal(result, {
				error: {
					code: Enums.Api.RcpErrorCode.InternalError,
					data: "extra-data",
					message: "boom",
				},
				id: 7,
				jsonrpc: "2.0",
			});
		});
	});
});
