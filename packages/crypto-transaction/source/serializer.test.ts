import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import {
	serializedTransactionContractCall,
	serializedTransactionContractCallWithSecondSignature,
	serializedTransactionDeploy,
	serializedTransactionTransfer,
} from "../test/fixtures/transaction";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";

describe<{
	app: Application;
	deserializer: Contracts.Crypto.TransactionDeserializer;
	serializer: Contracts.Crypto.TransactionSerializer;
}>("Serializer", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.serializer = context.app.get<Contracts.Crypto.TransactionSerializer>(
			Identifiers.Cryptography.Transaction.Serializer,
		);
		context.deserializer = context.app.get<Contracts.Crypto.TransactionDeserializer>(
			Identifiers.Cryptography.Transaction.Deserializer,
		);
	});

	it("should be ok", async ({ serializer, deserializer }) => {
		for (const serialized of [
			serializedTransactionContractCall,
			serializedTransactionContractCallWithSecondSignature,
			serializedTransactionDeploy,
			serializedTransactionTransfer,
		]) {
			const deserialized = await deserializer.deserialize(Buffer.from(serialized, "hex"));
			const reserialized = await serializer.serialize(deserialized);
			assert.equal(serialized, reserialized.toString("hex"));
		}
	});
});
