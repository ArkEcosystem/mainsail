import type { Validator } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";

import { headers, makeValidator, requestError, responseError } from "../../test/helpers/schemas";

describe<{
	validator: Validator;
}>("getPeers schema", ({ it, assert, beforeEach, each }) => {
	beforeEach((context) => {
		context.validator = makeValidator();
	});

	it("request - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(requestError(validator, "getPeers", { headers }));
	});

	it("request - should not accept a request without the header", ({ validator }) => {
		assert.string(requestError(validator, "getPeers", {}));
	});

	const peer = { ip: "1.2.3.4", port: 4002, protocol: 0 };

	it("response - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(
			responseError(validator, "getPeers", { headers, peers: [peer, { ...peer, ip: "2001:db8::1" }] }),
		);
	});

	it("response - should accept no peers and the largest list", ({ validator }) => {
		assert.undefined(responseError(validator, "getPeers", { headers, peers: [] }));
		assert.undefined(
			responseError(validator, "getPeers", { headers, peers: Array.from({ length: 500 }, () => peer) }),
		);
	});

	it("response - should not accept a response without the header", ({ validator }) => {
		assert.string(responseError(validator, "getPeers", { peers: [peer] }));
	});

	it("response - should not accept more peers than the largest list", ({ validator }) => {
		assert.string(
			responseError(validator, "getPeers", { headers, peers: Array.from({ length: 501 }, () => peer) }),
		);
	});

	each(
		"response - should not accept a peer with",
		({ dataset: [, change], context }) => {
			assert.string(responseError(context.validator, "getPeers", { headers, peers: [{ ...peer, ...change }] }));
		},
		[
			["an address that is no ip", { ip: "example.com" }],
			["no address", { ip: "" }],
			["a port above the largest", { port: 65_536 }],
			["an unknown protocol", { protocol: 2 }],
		] as [string, Record<string, unknown>][],
	);
});
