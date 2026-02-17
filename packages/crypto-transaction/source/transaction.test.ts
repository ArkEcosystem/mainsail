import { describe } from "@mainsail/test-runner";
import { transactionTransferData, serializedTransactionTransfer } from "../test/fixtures/transaction.js";
import { Transaction } from "./transaction.js";

describe("Transaction", ({ it, assert }) => {
	it("should create transaction and convert toData", () => {
		const transaction = new Transaction(transactionTransferData, Buffer.from(serializedTransactionTransfer, "hex"));

		assert.equal(transaction.toData(), transactionTransferData);
		assert.undefined(transaction.toData().legacySecondSignature);
		assert.equal(transaction.serialized.toString("hex"), serializedTransactionTransfer);
	});

	it("should create transaction and convert toData with legacySecondSignature", () => {
		const tx = {
			...transactionTransferData,
			legacySecondSignature: "022a6f404dbd49c9c74a3d88d65b967a9b51d3465c92833e8e2ede11e7242f014",
		};

		const transaction = new Transaction(tx, Buffer.from(serializedTransactionTransfer, "hex"));

		assert.equal(transaction.toData(), tx);
		assert.equal(transaction.toData().legacySecondSignature, tx.legacySecondSignature);
		assert.equal(transaction.serialized.toString("hex"), serializedTransactionTransfer);
	});
});
