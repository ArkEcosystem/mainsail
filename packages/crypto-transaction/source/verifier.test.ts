import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "../../test-framework/source";
import {
	serializedTransactionContractCall,
	serializedTransactionContractCallWithSecondSignature,
	serializedTransactionDeploy,
	serializedTransactionTransfer,
} from "../test/fixtures/transaction";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";

describe<{
	sandbox: Sandbox;
	verifier: Contracts.Crypto.TransactionVerifier;
	factory: Contracts.Crypto.TransactionFactory;
}>("Verifier", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.factory = context.sandbox.app.get<Contracts.Crypto.TransactionFactory>(
			Identifiers.Cryptography.Transaction.Factory,
		);
		context.verifier = context.sandbox.app.get<Contracts.Crypto.TransactionVerifier>(
			Identifiers.Cryptography.Transaction.Verifier,
		);
	});

	it("verifyHash - should be ok", async ({ factory, verifier }) => {
		for (const serialized of [
			serializedTransactionContractCall,
			serializedTransactionContractCallWithSecondSignature,
			serializedTransactionDeploy,
			serializedTransactionTransfer,
		]) {
			const transaction = await factory.fromHex(serialized);
			const verified = await verifier.verifyHash(transaction.data);
			assert.true(verified);
		}
	});
});
