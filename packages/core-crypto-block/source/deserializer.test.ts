import { describe } from "@arkecosystem/core-test-framework";

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
		blockFields.forEach((field) => {
			assert.equal(deserialized[field].toString(), dummyBlock2.data[field].toString());
		});

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
		deserialized.transactions.forEach((tx) => {
			const dummyBlockTx = dummyBlock2.data.transactions.find((dummyTx) => dummyTx.id === tx.id);
			assert.defined(dummyBlockTx);
			transactionFields.forEach((field) => {
				assert.equal(tx[field].toString(), dummyBlockTx[field].toString());
			});
		});
	});
});
