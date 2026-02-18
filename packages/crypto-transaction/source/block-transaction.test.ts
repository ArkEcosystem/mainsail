import { describe } from "@mainsail/test-runner";
import { Transactions, Serialized } from "../test/fixtures/index.js";
import { BlockTransaction } from "./block-transaction.js";

describe("BlockTransaction", ({ it, assert }) => {
	it("should create transaction and convert toData", () => {
		const tx = new BlockTransaction(
			Transactions.transactionTransfer,
			Buffer.from(Serialized.transactionTransfer, "hex"),
			{
				transactionIndex: 0,
				blockNumber: 1,
				blockHash: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		);

		const { serialized: _, ...transactionData } = Transactions.transactionTransfer;

		assert.equal(tx.toData(), transactionData);
		assert.undefined(tx.toData().legacySecondSignature);
		assert.equal(tx.serialized.toString("hex"), Serialized.transactionTransfer);

		assert.equal(tx.transactionIndex, 0);
		assert.equal(tx.blockNumber, 1);
		assert.equal(tx.blockHash, "0000000000000000000000000000000000000000000000000000000000000000");
	});

	it("should create transaction and convert toData with legacySecondSignature", () => {
		const tx = new BlockTransaction(Transactions.transactionContractCallWithSecondSignature, Buffer.from(Serialized.transactionContractCallWithSecondSignature, "hex"), {
			transactionIndex: 1,
			blockNumber: 1,
			blockHash: "0000000000000000000000000000000000000000000000000000000000000000",
		});

		const { serialized: _, ...transactionData } = Transactions.transactionContractCallWithSecondSignature;

		assert.equal(tx.toData(), transactionData);
		assert.equal(tx.toData().legacySecondSignature, transactionData.legacySecondSignature);
		assert.equal(tx.serialized.toString("hex"), Serialized.transactionContractCallWithSecondSignature);

		assert.equal(tx.transactionIndex, 1);
		assert.equal(tx.blockNumber, 1);
		assert.equal(tx.blockHash, "0000000000000000000000000000000000000000000000000000000000000000");
	});
});
