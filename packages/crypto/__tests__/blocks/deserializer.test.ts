import { Deserializer } from "../../../../packages/crypto/source/blocks/deserializer";
import { dummyBlock2 } from "../fixtures/block";

describe("block deserializer", () => {
	describe("deserialize", () => {
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
				expect(deserialized[field].toString()).toEqual(dummyBlock2.data[field].toString());
			});

			expect(deserialized.transactions).toHaveLength(dummyBlock2.data.transactions.length);

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
				expect(dummyBlockTx).toBeDefined();
				transactionFields.forEach((field) => {
					expect(tx[field].toString()).toEqual(dummyBlockTx[field].toString());
				});
			});
		});
	});
});
