import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { BlockResource } from "./index.js";

describe<{
	app: Application;
	resource: BlockResource;
	configuration: any;
}>("BlockResource", ({ beforeEach, it, assert, stub }) => {
	const block: any = {
		gasUsed: 21_000,
		hash: "4".repeat(64),
		logsBloom: "0".repeat(512),
		number: 255,
		parentHash: "1".repeat(64),
		payloadSize: 256,
		proposer: "0xABCDEF0000000000000000000000000000000000",
		stateRoot: "2".repeat(64),
		timestamp: 4096,
		transactions: [{ hash: "a".repeat(64) }, { hash: "b".repeat(64) }],
		transactionsRoot: "3".repeat(64),
	};

	beforeEach((context) => {
		context.configuration = {
			getMilestone: () => ({ block: { maxGasLimit: 30_000_000 } }),
		};

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);

		context.resource = context.app.resolve(BlockResource);
	});

	it("should transform block into eth JSON-RPC shape with tx hashes (transactionObject=false)", async ({
		resource,
	}) => {
		const result: any = await resource.transform(block, false);

		assert.equal(result.number, "0xff");
		assert.equal(result.hash, `0x${"4".repeat(64)}`);
		assert.equal(result.parentHash, `0x${"1".repeat(64)}`);
		assert.equal(result.nonce, "0x0000000000000000");
		assert.equal(result.sha3Uncles, "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347");
		assert.equal(result.logsBloom, `0x${"0".repeat(512)}`);
		assert.equal(result.transactionsRoot, `0x${"3".repeat(64)}`);
		assert.equal(result.stateRoot, `0x${"2".repeat(64)}`);
		assert.equal(result.receiptsRoot, `0x${"2".repeat(64)}`);
		assert.equal(result.miner, "0xabcdef0000000000000000000000000000000000");
		assert.equal(result.difficulty, "0x0");
		assert.equal(result.totalDifficulty, "0x0");
		assert.equal(result.extraData, "0x");
		assert.equal(result.size, "0x100");
		assert.equal(result.gasLimit, "0x1c9c380");
		assert.equal(result.gasUsed, "0x5208");
		assert.equal(result.timestamp, "0x1000");
		assert.equal(result.transactions, [`0x${"a".repeat(64)}`, `0x${"b".repeat(64)}`]);
		assert.equal(result.uncles, []);
	});

	it("should use milestone maxGasLimit for gasLimit at the block's number", async ({ resource, configuration }) => {
		const spyGetMilestone = stub(configuration, "getMilestone").returnValue({ block: { maxGasLimit: 15_000_000 } });

		const result: any = await resource.transform(block, false);

		spyGetMilestone.calledWith(255);
		assert.equal(result.gasLimit, "0xe4e1c0");
	});

	it("should transform transactions into objects when transactionObject=true", async ({ resource }) => {
		const objBlock: any = {
			...block,
			transactions: [
				{
					data: "0x1234",
					from: "0x1111111111111111111111111111111111111111",
					gasLimit: 21_000,
					gasPrice: 5,
					hash: "a".repeat(64),
					network: 30,
					nonce: 1,
					r: "e".repeat(64),
					s: "f".repeat(64),
					to: "0x2222222222222222222222222222222222222222",
					transactionIndex: 0,
					v: 1,
					value: 100,
				},
			],
		};

		const result: any = await resource.transform(objBlock, true);

		assert.equal(result.transactions.length, 1);
		const tx = result.transactions[0];
		assert.equal(tx.hash, `0x${"a".repeat(64)}`);
		assert.equal(tx.blockHash, `0x${"4".repeat(64)}`);
		assert.equal(tx.blockNumber, "0xff");
		assert.equal(tx.from, "0x1111111111111111111111111111111111111111");
		assert.equal(tx.to, "0x2222222222222222222222222222222222222222");
		assert.equal(tx.input, "0x1234");
		assert.equal(tx.gas, "0x5208");
		assert.equal(tx.value, "0x64");
		assert.equal(tx.chainId, "0x1e");
	});

	it("should return empty transactions array for an empty block", async ({ resource }) => {
		const emptyBlock: any = { ...block, transactions: [] };

		const hashResult: any = await resource.transform(emptyBlock, false);
		assert.equal(hashResult.transactions, []);

		const objResult: any = await resource.transform(emptyBlock, true);
		assert.equal(objResult.transactions, []);
	});
});
