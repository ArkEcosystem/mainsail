import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { describe, Sandbox } from "@mainsail/test-framework";
import {
	serializedTransactionContractCall,
	serializedTransactionContractCallWithSecondSignature,
	serializedTransactionDeploy,
	serializedTransactionTransfer,
	serializedTransactionTransferEqualGreater11Fields,
	serializedTransactionTransferLessThan9Fields,
} from "../test/fixtures/transaction";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";

describe<{
	sandbox: Sandbox;
	deserializer: Contracts.Crypto.TransactionDeserializer;
}>("Deserializer", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.deserializer = context.sandbox.app.get<Contracts.Crypto.TransactionDeserializer>(
			Identifiers.Cryptography.Transaction.Deserializer,
		);
	});

	it("should be ok", async ({ deserializer }) => {
		for (const serialized of [
			serializedTransactionContractCall,
			serializedTransactionContractCallWithSecondSignature,
			serializedTransactionDeploy,
			serializedTransactionTransfer,
		]) {
			await assert.resolves(async () => deserializer.deserialize(Buffer.from(serialized, "hex")));
		}
	});

	it("should not deserialize transaction with invalid number of fields", async ({ deserializer }) => {
		for (const [serialized, error] of [
			[serializedTransactionTransferLessThan9Fields, "decoded RLP contains too few fields"],
			[serializedTransactionTransferEqualGreater11Fields, "decoded RLP contains too many fields"],
		]) {
			await assert.rejects(async () => deserializer.deserialize(Buffer.from(serialized, "hex")), error);
		}
	});
});
