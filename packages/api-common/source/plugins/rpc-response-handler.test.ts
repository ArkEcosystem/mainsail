import Boom from "@hapi/boom";

import { Enums } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { rpcResponseHandler } from "./rpc-response-handler";

describe<{
	extMethod: (request: any, h: any) => any;
	h: { continue: symbol; response: (x: any) => any };
}>("rpcResponseHandler", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		let captured: any;

		const fakeServer = {
			ext: (config: any) => {
				captured = config;
			},
		};

		rpcResponseHandler.register(fakeServer as any);

		assert.equal(captured.type, "onPreResponse");
		context.extMethod = captured.method;

		context.h = {
			continue: Symbol("continue"),
			response: (x: any) => x,
		};
	});

	it("has expected plugin metadata", () => {
		assert.is(rpcResponseHandler.name, "rcpResponseHandler");
		assert.is(rpcResponseHandler.version, "1.0.0");
	});

	it("converts a boom response to an RPC error when method post and path is the RPC root '/'", ({ extMethod, h }) => {
		const request = {
			method: "post",
			path: "/",
			payload: { id: 7 },
			response: Boom.badImplementation("boom message"),
		};

		const result = extMethod(request, h);

		assert.equal(result, {
			error: {
				code: Enums.Api.RcpErrorCode.InternalError,
				data: undefined,
				message: "An internal server error occurred",
			},
			id: 7,
			jsonrpc: "2.0",
		});
	});

	it("uses null id when payload has no id", ({ extMethod, h }) => {
		const request = {
			method: "post",
			path: "",
			payload: {},
			response: Boom.badImplementation("boom message"),
		};

		const result = extMethod(request, h);

		assert.is(result.jsonrpc, "2.0");
		// eslint-disable-next-line unicorn/no-null
		assert.is(result.id, null);
		assert.is(result.error.code, Enums.Api.RcpErrorCode.InternalError);
	});

	it("returns h.continue for a non-boom response", ({ extMethod, h }) => {
		const request = {
			method: "post",
			path: "",
			payload: { id: 1 },
			response: { isBoom: false },
		};

		const result = extMethod(request, h);

		assert.is(result, h.continue);
	});

	it("returns h.continue for a boom response when method is not post", ({ extMethod, h }) => {
		const request = {
			method: "get",
			path: "",
			payload: { id: 1 },
			response: Boom.badImplementation("boom message"),
		};

		const result = extMethod(request, h);

		assert.is(result, h.continue);
	});

	it("returns h.continue for a boom response when path is not empty", ({ extMethod, h }) => {
		const request = {
			method: "post",
			path: "/api",
			payload: { id: 1 },
			response: Boom.badImplementation("boom message"),
		};

		const result = extMethod(request, h);

		assert.is(result, h.continue);
	});
});
