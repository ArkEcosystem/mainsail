import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Deserialized, Serialized } from "../test/fixtures/index.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";

describe<{
	app: Application;
	deserializer: Contracts.Crypto.TransactionDeserializer;
}>("Deserializer", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.deserializer = context.app.get<Contracts.Crypto.TransactionDeserializer>(
			Identifiers.Cryptography.Transaction.Deserializer,
		);
	});

	it("should be ok", async ({ deserializer }) => {
		for (const [serialized, deserialized] of [
			[Serialized.transactionContractCall, Deserialized.transactionContractCall],
			[
				Serialized.transactionContractCallWithSecondSignature,
				Deserialized.transactionContractCallWithSecondSignature,
			],
			[Serialized.transactionDeploy, Deserialized.transactionDeploy],
			[Serialized.transactionTransfer, Deserialized.transactionTransfer],
		]) {
			await assert.equal((await deserializer.deserialize(Buffer.from(serialized, "hex"))).data, deserialized);
		}
	});

	it("should not deserialize transaction with invalid number of fields", async ({ deserializer }) => {
		for (const [serialized, error] of [
			[Serialized.transactionTransferLessThan9Fields, "decoded RLP contains too few fields"],
			[Serialized.transactionTransferEqualGreater11Fields, "decoded RLP contains too many fields"],
		]) {
			await assert.rejects(async () => deserializer.deserialize(Buffer.from(serialized, "hex")), error);
		}
	});
});
