import { describe } from "../../core-test-framework";
import { dummyBlock2 } from "../../test/fixtures/block";
import { Deserializer } from "./deserializer";

describe("block deserializer", ({ it, assert }) => {
	it("should correctly deserialize a block", () => {
		const deserialized = Deserializer.deserialize(Buffer.from(dummyBlock2.serializedFull, "hex")).data;

		const blockFields = [
			"id",
			"timestamp",
			"version",
			"height",
			"previousBlock",
			"numberOfTransactions",
			"totalAmount",
			"totalFee",
			"reward",
			"payloadLength",
			"payloadHash",
			"generatorPublicKey",
			"blockSignature",
		];
		for (const field of blockFields) {
			assert.equal(deserialized[field].toString(), dummyBlock2.data[field].toString());
		}

		assert.length(deserialized.transactions, dummyBlock2.data.transactions.length);

		const transactionFields = [
			"id",
			"type",
			"timestamp",
			"senderPublicKey",
			"fee",
			"amount",
			"recipientId",
			"signature",
		];
		for (const tx of deserialized.transactions) {
			const dummyBlockTx = dummyBlock2.data.transactions.find((dummyTx) => dummyTx.id === tx.id);
			assert.defined(dummyBlockTx);
			for (const field of transactionFields) {
				assert.equal(tx[field].toString(), dummyBlockTx[field].toString());
			}
		}
	});
});
