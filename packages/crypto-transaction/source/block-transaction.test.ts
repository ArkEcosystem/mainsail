import { describe } from "@mainsail/test-runner";
import { transactionTransferData, serializedTransactionTransfer } from "../test/fixtures/transaction.js";
import { BlockTransaction } from "./block-transaction.js";

describe("BlockTransaction", ({ it, assert }) => {
	it("should create transaction and convert toData", () => {
		const transaction = new BlockTransaction(
			transactionTransferData,
			Buffer.from(serializedTransactionTransfer, "hex"),
			{
				transactionIndex: 0,
				blockNumber: 1,
				blockHash: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		);

		assert.equal(transaction.toData(), transactionTransferData);
		assert.undefined(transaction.toData().legacySecondSignature);
		assert.equal(transaction.serialized.toString("hex"), serializedTransactionTransfer);

		assert.equal(transaction.transactionIndex, 0);
		assert.equal(transaction.blockNumber, 1);
		assert.equal(transaction.blockHash, "0000000000000000000000000000000000000000000000000000000000000000");
	});

	it("should create transaction and convert toData with legacySecondSignature", () => {
		const tx = {
			...transactionTransferData,
			legacySecondSignature: "022a6f404dbd49c9c74a3d88d65b967a9b51d3465c92833e8e2ede11e7242f014",
		};

		const transaction = new BlockTransaction(tx, Buffer.from(serializedTransactionTransfer, "hex"), {
			transactionIndex: 1,
			blockNumber: 1,
			blockHash: "0000000000000000000000000000000000000000000000000000000000000000",
		});

		assert.equal(transaction.toData(), tx);
		assert.equal(transaction.toData().legacySecondSignature, tx.legacySecondSignature);
		assert.equal(transaction.serialized.toString("hex"), serializedTransactionTransfer);

		assert.equal(transaction.transactionIndex, 1);
		assert.equal(transaction.blockNumber, 1);
		assert.equal(transaction.blockHash, "0000000000000000000000000000000000000000000000000000000000000000");
	});
});
