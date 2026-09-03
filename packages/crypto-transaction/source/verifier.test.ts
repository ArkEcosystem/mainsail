import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Serialized } from "../test/fixtures/index";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { InvalidLegacySecondSignatureError, MissingLegacySecondSignatureError } from "@mainsail/exceptions";

describe<{
	app: Application;
	verifier: Contracts.Crypto.TransactionVerifier;
	factory: Contracts.Crypto.TransactionFactory;
}>("Verifier", ({ it, beforeEach, assert }) => {
	const txData = {
		hash: "3a5823fe8f498b2e509974b3939584bd1200ad32fa32bc8a1a778b608f79f780",
		network: 10000,
		from: "0x75545540230d5c3BEf023202d23CB74cFA723376",
		senderPublicKey: "03e0812731df97edc9990d55d919b33294f131b5fd44996266859cfd2514514121",
		senderLegacyAddress: "DH8WhBj6ron2tQhdFPQzjDcrk2CCY997MP",
		to: "0xBe89811e15f611C1db12e59679b6F3DC1F430155",
		value: 1n,
		gasPrice: 5000000000,
		gasLimit: 1000000,
		nonce: 0n,
		data: "0x",
		v: 0,
		r: "921101a4583fb153ec00e501f3c2e2636114e1c8c58d2df8a19426cc066a6768",
		s: "22db4bce1e0ace485ce0838d178b4d5bcfa9f69b315a14c580d9b01e5c980bdd",
	};

	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.factory = context.app.get<Contracts.Crypto.TransactionFactory>(
			Identifiers.Cryptography.Transaction.Factory,
		);
		context.verifier = context.app.get<Contracts.Crypto.TransactionVerifier>(
			Identifiers.Cryptography.Transaction.Verifier,
		);
	});

	it("verifySchema - should be ok", async ({ factory, verifier }) => {
		for (const serialized of [
			Serialized.transactionContractCall,
			Serialized.transactionContractCallWithSecondSignature,
			Serialized.transactionDeploy,
			Serialized.transactionTransfer,
		]) {
			const transaction = await factory.fromHex(serialized);
			assert.undefined((await verifier.verifySchemaUnsigned(transaction.toData())).error);
			assert.undefined((await verifier.verifySchemaSigned(transaction.toData())).error);
			assert.undefined((await verifier.verifySchemaStrict(transaction.toData())).error);
		}
	});

	it("verifySchema - should be false", async ({ factory, verifier }) => {
		for (const serialized of [
			Serialized.transactionContractCall,
			Serialized.transactionContractCallWithSecondSignature,
			Serialized.transactionDeploy,
			Serialized.transactionTransfer,
		]) {
			const transaction = (await factory.fromHex(serialized)).toData();

			assert.defined((await verifier.verifySchemaUnsigned({ ...transaction, v: 2 })).error); // Invalid v
			assert.defined((await verifier.verifySchemaSigned({ ...transaction, v: 2 })).error); // Invalid v
			assert.defined((await verifier.verifySchemaStrict({ ...transaction, test: "test" })).error); // Extra property in strict mode
		}
	});

	it("verifyLegacySecondSignature - should be ok", async ({ factory, verifier }) => {
		const transaction = await factory.fromHex(Serialized.transactionTransferWithSecondSignature);

		assert.true(
			await verifier.verifyLegacySecondSignature(
				transaction.toData(),
				"02f0f1217bace23ac2ac9438b65a8dcc693905bee511b49d5ade499a8c8da8a3e4",
			),
		);
	});

	it("verifyLegacySecondSignature - should throw if invalid", async ({ factory, verifier }) => {
		const transaction = await factory.fromHex(Serialized.transactionTransferWithSecondSignature);

		await assert.rejects(
			() =>
				verifier.verifyLegacySecondSignature(
					transaction.toData(),
					"02f0f1217bace23ac2ac9438b65a8dcc693905bee511b49d5ade499a8c8da8a3e6",
				),
			InvalidLegacySecondSignatureError,
		);
	});

	it("verifyLegacySecondSignature - should throw if legacySecondSignature is missing", async ({
		factory,
		verifier,
	}) => {
		const transaction = await factory.fromHex(Serialized.transactionTransfer);

		await assert.rejects(
			() =>
				verifier.verifyLegacySecondSignature(
					transaction.toData(),
					"02f0f1217bace23ac2ac9438b65a8dcc693905bee511b49d5ade499a8c8da8a3e4",
				),
			MissingLegacySecondSignatureError,
		);
	});
});
