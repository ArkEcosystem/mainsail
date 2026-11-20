import type { Validator } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";

import { headers, makeValidator, requestError, responseError } from "../../test/helpers/schemas";

describe<{
	validator: Validator;
}>("getStatus schema", ({ it, assert, beforeEach, each }) => {
	beforeEach((context) => {
		context.validator = makeValidator();
	});

	it("request - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(requestError(validator, "getStatus", { headers }));
	});

	it("request - should not accept a request without the header", ({ validator }) => {
		assert.string(requestError(validator, "getStatus", {}));
	});

	const plugin = { enabled: true, estimateTotalCount: true, port: 4003 };
	const network = {
		explorer: "https://explorer.example.com",
		name: "devnet",
		nethash: "a".repeat(64),
		token: { name: "TOKEN", symbol: "T" },
		version: 30,
	};
	const config = { network, plugins: { "@mainsail/api-http": plugin }, version: "0.0.1-rc.9" };
	const state = { blockHash: "b".repeat(64), blockNumber: 12 };

	it("response - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(responseError(validator, "getStatus", { config, headers, state }));
	});

	it("response - should accept a node without plugins that is still at the genesis block", ({ validator }) => {
		assert.undefined(
			responseError(validator, "getStatus", {
				config: { ...config, plugins: {} },
				headers,
				state: { ...state, blockNumber: 0 },
			}),
		);
	});

	it("response - should not accept a response without the header, the state or the config", ({ validator }) => {
		assert.string(responseError(validator, "getStatus", { config, state }));
		assert.string(responseError(validator, "getStatus", { config, headers }));
		assert.string(responseError(validator, "getStatus", { headers, state }));
	});

	each(
		"response - should not accept",
		({ dataset: [, change], context }) => {
			assert.string(responseError(context.validator, "getStatus", { config, headers, state, ...change }));
		},
		[
			["a block hash that is no hash", { state: { ...state, blockHash: "b".repeat(63) } }],
			["a version of fewer than 5 characters", { config: { ...config, version: "1.0" } }],
			["a version of more than 24 characters", { config: { ...config, version: "1".repeat(25) } }],
			["a nethash that is no hash", { config: { ...config, network: { ...network, nethash: "xyz" } } }],
			["a network without a name", { config: { ...config, network: { ...network, name: "" } } }],
			[
				"a network name of more than 20 characters",
				{ config: { ...config, network: { ...network, name: "n".repeat(21) } } },
			],
			[
				"an explorer of more than 128 characters",
				{ config: { ...config, network: { ...network, explorer: "e".repeat(129) } } },
			],
			[
				"a token symbol of more than 4 characters",
				{ config: { ...config, network: { ...network, token: { name: "TOKEN", symbol: "TOKEN" } } } },
			],
			["a network version above 255", { config: { ...config, network: { ...network, version: 256 } } }],
			["a plugin name of fewer than 4 characters", { config: { ...config, plugins: { abc: plugin } } }],
			[
				"a plugin port above the largest",
				{ config: { ...config, plugins: { "@mainsail/api-http": { ...plugin, port: 65_536 } } } },
			],
			[
				"more than 32 plugins",
				{
					config: {
						...config,
						plugins: Object.fromEntries(
							Array.from({ length: 33 }, (_, index) => [`plugin-${index}`, plugin]),
						),
					},
				},
			],
		] as [string, Record<string, unknown>][],
	);
});
