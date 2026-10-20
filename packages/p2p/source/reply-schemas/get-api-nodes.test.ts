import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { headers } from "../../test/fixtures/responses/headers";
import { prepareValidatorContext } from "../../test/helpers/prepare-validator-context";
import { constants } from "../constants";
import { getApiNodes } from "./get-api-nodes";

type Context = {
	app: Application;
	validator: Contracts.Crypto.Validator;
};

describe<Context>("GetApiNodes Schema", ({ it, assert, beforeEach, each }) => {
	let data;

	beforeEach(async (context) => {
		data = {
			headers,
			apiNodes: [{ url: "http://1.2.3.4:4003/" }, { url: "https://api.example.com/api" }],
		};

		context.app = new Application();
		await prepareValidatorContext(context);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(getApiNodes, data);

		assert.undefined(result.error);
	});

	it("should pass with an empty list", ({ validator }) => {
		const result = validator.validate(getApiNodes, { ...data, apiNodes: [] });

		assert.undefined(result.error);
	});

	each(
		"should not pass if required property is not defined",
		({ context, dataset }) => {
			delete data[dataset];
			const result = context.validator.validate(getApiNodes, data);

			assert.defined(result.error);
		},
		["headers", "apiNodes"],
	);

	it("should not pass if apiNode.url is missing", ({ validator }) => {
		const result = validator.validate(getApiNodes, { ...data, apiNodes: [{}] });

		assert.defined(result.error);
	});

	it("should not pass the legacy { ip, port, protocol } shape", ({ validator }) => {
		const result = validator.validate(getApiNodes, {
			...data,
			apiNodes: [{ ip: "127.0.0.1", port: 4003, protocol: 0 }],
		});

		assert.defined(result.error);
	});

	it("should not pass if apiNode has additional properties", ({ validator }) => {
		const result = validator.validate(getApiNodes, {
			...data,
			apiNodes: [{ url: "http://1.2.3.4:4003/", port: 4003 }],
		});

		assert.defined(result.error);
	});

	each(
		"should not pass if apiNode.url is not a string",
		({ context, dataset }) => {
			const result = context.validator.validate(getApiNodes, { ...data, apiNodes: [{ url: dataset }] });

			assert.defined(result.error);
		},
		[1, null, true, {}, []],
	);

	// A single non-public entry must not reject the whole reply; the discoverer drops such entries one by one.
	it("should pass a non-public url next to public ones", ({ validator }) => {
		const result = validator.validate(getApiNodes, {
			...data,
			apiNodes: [{ url: "http://10.0.0.5:4003/" }, { url: "http://1.2.3.4:4003/" }, { url: "not a url" }],
		});

		assert.undefined(result.error);
	});

	it("should not pass if apiNode.url is longer than 2048 characters", ({ validator }) => {
		const result = validator.validate(getApiNodes, {
			...data,
			apiNodes: [{ url: `http://1.2.3.4/${"a".repeat(2048)}` }],
		});

		assert.defined(result.error);
	});

	it("should not pass if apiNodes.length > MAX_PEERS_GET_API_NODES", ({ validator }) => {
		const result = validator.validate(getApiNodes, {
			...data,
			apiNodes: new Array(constants.MAX_PEERS_GET_API_NODES + 1).fill({ url: "http://1.2.3.4:4003/" }),
		});

		assert.defined(result.error);
	});
});
