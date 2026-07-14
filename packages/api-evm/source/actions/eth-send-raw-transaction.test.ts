import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { RpcError } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { http } from "@mainsail/utils";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import { EthSendRawTransactionAction } from "./index.js";

// NOTE: the action calls `http.post` from "@mainsail/utils". That helper captures the node
// `http.request` binding at import time, so `nock` cannot intercept it. We therefore stub
// `http.post` directly, which lets us assert both the request (url + body) and the branching
// on the response.
describe<{
	app: Application;
	action: EthSendRawTransactionAction;
	validator: Contracts.Crypto.Validator;
	transactionFactory: any;
}>("EthSendRawTransactionAction", ({ beforeEach, afterEach, it, assert, stub }) => {
	const envKeys = [
		"MAINSAIL_API_TRANSACTION_POOL_DISABLED",
		"MAINSAIL_API_TRANSACTION_POOL_HOST",
		"MAINSAIL_API_TRANSACTION_POOL_PORT",
		"MAINSAIL_API_TRANSACTION_POOL_SSL",
		"MAINSAIL_API_TRANSACTION_POOL_SSL_HOST",
		"MAINSAIL_API_TRANSACTION_POOL_SSL_PORT",
	];
	let savedEnv: Record<string, string | undefined> = {};

	// http.post returns an HttpResponse whose `.data` is the parsed JSON body. The action reads
	// `response.data.data.<accept|errors>`, so the body itself is `{ data: ProcessorResult }`.
	const reply = (processorResult: any, statusCode = 200) => ({ data: { data: processorResult }, statusCode });

	beforeEach(async (context) => {
		savedEnv = {};
		for (const key of envKeys) {
			savedEnv[key] = process.env[key];
			delete process.env[key];
		}

		context.transactionFactory = {
			fromHex: async () => ({ hash: "abcd" }),
		};

		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();

		context.app.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue(context.transactionFactory);

		context.action = context.app.resolve(EthSendRawTransactionAction);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	afterEach(() => {
		for (const key of envKeys) {
			if (savedEnv[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = savedEnv[key];
			}
		}
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_sendRawTransaction");
	});

	it("schema should accept exactly one prefixed hex quantity", ({ action, validator }) => {
		// prefixedQuantityHex is already registered by the ValidationServiceProvider.
		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_eth_sendRawTransaction", ["0x1234"]).errors);

		// too many items
		assert.defined(validator.validate("jsonRpc_eth_sendRawTransaction", ["0x1234", "0x5678"]).errors);
		// too few items
		assert.defined(validator.validate("jsonRpc_eth_sendRawTransaction", []).errors);
		// wrong type
		assert.defined(validator.validate("jsonRpc_eth_sendRawTransaction", [1]).errors);
		assert.defined(validator.validate("jsonRpc_eth_sendRawTransaction", {}).errors);
	});

	it("should POST the 0x-stripped tx to the default tx-pool url and return 0x<hash> on accept", async ({
		action,
		transactionFactory,
	}) => {
		const post = stub(http, "post").resolvedValue(reply({ accept: [0], errors: {} }));
		const fromHex = spyFromHex(transactionFactory);

		const result = await action.handle(["0xdeadbeef"]);

		assert.equal(result, "0xabcd");

		// url + body assertions
		const [url, options] = post.getCallArgs(0);
		assert.equal(url, "http://0.0.0.0:4007/api/transactions");
		assert.equal(options, { body: { transactions: ["deadbeef"] } });

		// hash comes from the factory, which receives the 0x-stripped payload
		assert.equal(fromHex.calls, ["deadbeef"]);
	});

	it("should throw RpcError carrying the pool error message when accept is empty", async ({ action }) => {
		stub(http, "post").resolvedValue(reply({ accept: [], errors: { 0: { message: "nonce too low" } } }));

		await assert.rejects(() => action.handle(["0xdeadbeef"]), "nonce too low");
	});

	it("should not call transactionFactory when the transaction is rejected", async ({
		action,
		transactionFactory,
	}) => {
		stub(http, "post").resolvedValue(reply({ accept: [], errors: { 0: { message: "bad" } } }));
		const fromHex = spyFromHex(transactionFactory);

		await assert.rejects(() => action.handle(["0xdeadbeef"]));
		assert.equal(fromHex.calls.length, 0);
	});

	it("should throw a generic RpcError when neither accept nor errors are present", async ({ action }) => {
		stub(http, "post").resolvedValue(reply({ accept: [], errors: {} }));

		await assert.rejects(() => action.handle(["0xdeadbeef"]), "Error sending transaction");
	});

	it("should throw a generic RpcError on a non-200 (but non-throwing) status", async ({ action }) => {
		stub(http, "post").resolvedValue(reply({ accept: [0], errors: {} }, 201));

		await assert.rejects(() => action.handle(["0xdeadbeef"]), "Error sending transaction");
	});

	it("should throw an RpcError instance (not a plain Error) for pool errors", async ({ action }) => {
		stub(http, "post").resolvedValue(reply({ accept: [], errors: { 0: { message: "boom" } } }));

		await assert.rejects(() => action.handle(["0xdeadbeef"]), RpcError);
	});

	it("should POST to the https url when only the ssl pool server is enabled", async ({ action }) => {
		process.env.MAINSAIL_API_TRANSACTION_POOL_DISABLED = "true";
		process.env.MAINSAIL_API_TRANSACTION_POOL_SSL = "true";

		const post = stub(http, "post").resolvedValue(reply({ accept: [0], errors: {} }));

		assert.equal(await action.handle(["0xdeadbeef"]), "0xabcd");

		const [url] = post.getCallArgs(0);
		assert.equal(url, "https://0.0.0.0:8447/api/transactions");
	});

	it("should honor custom host/port env vars", async ({ action }) => {
		process.env.MAINSAIL_API_TRANSACTION_POOL_HOST = "example.test";
		process.env.MAINSAIL_API_TRANSACTION_POOL_PORT = "9999";

		const post = stub(http, "post").resolvedValue(reply({ accept: [0], errors: {} }));

		await action.handle(["0xdeadbeef"]);

		const [url] = post.getCallArgs(0);
		assert.equal(url, "http://example.test:9999/api/transactions");
	});

	it("should throw 'Server is not enabled' when neither http nor https pool server is enabled", async ({
		action,
	}) => {
		process.env.MAINSAIL_API_TRANSACTION_POOL_DISABLED = "true";
		// SSL stays disabled (env unset)

		// http.post must never be reached in this branch.
		const post = stub(http, "post").resolvedValue(reply({ accept: [0], errors: {} }));

		await assert.rejects(() => action.handle(["0xdeadbeef"]), "Server is not enabled");
		post.neverCalled();
	});
});

// Small helper: replace fromHex with a call-recording implementation.
function spyFromHex(transactionFactory: any): { calls: string[] } {
	const state = { calls: [] as string[] };
	transactionFactory.fromHex = async (payload: string) => {
		state.calls.push(payload);
		return { hash: "abcd" };
	};
	return state;
}
