import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import { EthGetTransactionReceipt } from "./index.js";

// Mirrors @mainsail/crypto-transaction's prefixedTransactionHash schema (a 66-char prefixed hex).
const prefixedTransactionHash = {
	$id: "prefixedTransactionHash",
	allOf: [{ maxLength: 66, minLength: 66 }, { $ref: "prefixedQuantityHex" }],
	type: "string",
};

describe<{
	app: Application;
	action: EthGetTransactionReceipt;
	validator: Contracts.Crypto.Validator;
	database: any;
	evm: any;
}>("EthGetTransactionReceipt", ({ beforeEach, it, assert, stub }) => {
	const transaction = {
		blockHash: "aa".repeat(32),
		blockNumber: 16,
		from: "0x0000000000000000000000000000000000000001",
		gasPrice: 1_000_000_000,
		hash: "bb".repeat(32),
		to: "0x0000000000000000000000000000000000000002",
		transactionIndex: 0,
	};

	const header = { logsBloom: "cc".repeat(256) };

	const receipt = {
		contractAddress: undefined,
		cumulativeGasUsed: BigInt(21_000),
		gasUsed: BigInt(21_000),
		logs: [],
		status: 1,
	};

	beforeEach(async (context) => {
		context.database = {
			getBlockHeader: async () => header,
			getTransactionByHash: async () => transaction,
		};

		context.evm = {
			getReceipt: async () => ({ receipt }),
		};

		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();

		context.app.bind(Identifiers.Database.Service).toConstantValue(context.database);
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm).whenTagged("instance", "rpc");

		context.action = context.app.resolve(EthGetTransactionReceipt);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getTransactionReceipt");
	});

	it("schema should require a single prefixed transaction hash", ({ action, validator }) => {
		validator.addSchema(prefixedTransactionHash);
		validator.addSchema(action.schema);

		const good = [`0x${"bb".repeat(32)}`];
		assert.undefined(validator.validate("jsonRpc_eth_getTransactionReceipt", good).errors);

		// too many items
		assert.defined(
			validator.validate("jsonRpc_eth_getTransactionReceipt", [`0x${"bb".repeat(32)}`, "0x00"]).errors,
		);
		// empty
		assert.defined(validator.validate("jsonRpc_eth_getTransactionReceipt", []).errors);
		// wrong type
		assert.defined(validator.validate("jsonRpc_eth_getTransactionReceipt", [1]).errors);
		// not a 32-byte hash
		assert.defined(validator.validate("jsonRpc_eth_getTransactionReceipt", ["0x1234"]).errors);
	});

	it("should return null when transaction not found", async ({ action, database }) => {
		stub(database, "getTransactionByHash").resolvedValue(undefined);

		assert.null(await action.handle([`0x${"bb".repeat(32)}`]));
	});

	it("should strip the 0x prefix before looking up the transaction", async ({ action, database }) => {
		const spy = stub(database, "getTransactionByHash").resolvedValue(undefined);

		await action.handle([`0x${"bb".repeat(32)}`]);

		spy.calledWith("bb".repeat(32));
	});

	it("should return null when block header not found", async ({ action, database }) => {
		stub(database, "getBlockHeader").resolvedValue(undefined);

		assert.null(await action.handle([`0x${"bb".repeat(32)}`]));
	});

	it("should return null when receipt is missing", async ({ action, evm }) => {
		stub(evm, "getReceipt").resolvedValue({ receipt: undefined });

		assert.null(await action.handle([`0x${"bb".repeat(32)}`]));
	});

	it("should look up the receipt by block number and tx hash", async ({ action, evm }) => {
		const spy = stub(evm, "getReceipt").resolvedValue({ receipt });

		await action.handle([`0x${"bb".repeat(32)}`]);

		spy.calledWith(BigInt(16), "bb".repeat(32));
	});

	it("should return the transformed receipt when found", async ({ action }) => {
		const result: any = await action.handle([`0x${"bb".repeat(32)}`]);

		assert.equal(result, {
			blockHash: `0x${"aa".repeat(32)}`,
			blockNumber: "0x10",
			// eslint-disable-next-line unicorn/no-null
			contractAddress: null,
			cumulativeGasUsed: "0x5208",
			effectiveGasPrice: "0x3b9aca00",
			from: "0x0000000000000000000000000000000000000001",
			gasUsed: "0x5208",
			logs: [],
			logsBloom: `0x${"cc".repeat(256)}`,
			status: "0x1",
			to: "0x0000000000000000000000000000000000000002",
			transactionHash: `0x${"bb".repeat(32)}`,
			transactionIndex: "0x0",
			type: "0x0",
		});
	});
});
