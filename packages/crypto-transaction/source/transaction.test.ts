import { describe } from "@mainsail/test-runner";
import { Transactions, Serialized } from "../test/fixtures/index.js";
import { Transaction } from "./transaction.js";

describe("Transaction", ({ it, assert }) => {
	it("should create transaction and convert toData", () => {
		const tx = new Transaction(
			Transactions.transactionTransfer,
			Buffer.from(Serialized.transactionTransfer, "hex"),
		);

		const { serialized: _, ...transactionData } = Transactions.transactionTransfer;
		assert.equal(tx.toData(), transactionData);
		assert.undefined(tx.toData().legacySecondSignature);
		assert.equal(tx.serialized.toString("hex"), Serialized.transactionTransfer);
	});

	it("should create transaction and convert toData with legacySecondSignature", () => {
		const tx = new Transaction(
			Transactions.transactionContractCallWithSecondSignature,
			Buffer.from(Serialized.transactionContractCallWithSecondSignature, "hex"),
		);

		const { serialized: _, ...transactionData } = Transactions.transactionContractCallWithSecondSignature;
		assert.equal(tx.toData(), transactionData);
		assert.equal(
			tx.toData().legacySecondSignature,
			Transactions.transactionContractCallWithSecondSignature.legacySecondSignature,
		);
		assert.equal(tx.serialized.toString("hex"), Serialized.transactionContractCallWithSecondSignature);
	});
});
