import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { TransactionBuilder } from "./builder.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { BigNumber } from "@mainsail/utils";

const wallet = {
	passphrase: "donor assault bridge robust asthma memory thunder cruel eagle obvious act sound bounce orange donkey reform city frost mix install average country strategy rough",
	publicKey: "02f0f1217bace23ac2ac9438b65a8dcc693905bee511b49d5ade499a8c8da8a3e4",
	privateKey: "9be3cd2b0efa7b4d82d68496cf95f0a6c69155a410c7c29e6ec47b27478dec63",
	address: "0xa92D8ba95B46bcFD0177E203C515885E91DF03F4",
	legacyAddress: "DBcN6tLzebNYT9oAfXtUYS7WhSTfcfM19C",
	WIF:  "Uc5K4F7w46zZV4TXcL77LoZpnEEyujnpLY995BFP58q9A7kvoQsq"
}

describe<{
	app: Application;
	builder: TransactionBuilder;
}>("TransactionBuilder", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);
		context.builder = context.app.resolve(TransactionBuilder);
	});

	it("#build - should work with default options", async ({ app }) => {
		const transaction = {
			hash: '64ff1ac71a06deb6a2d544786f8751b534c1c38284ccfa5faf2565d19b9f5151',
			network: 10000,
			from: wallet.address,
			senderPublicKey: wallet.publicKey,
			senderLegacyAddress: wallet.legacyAddress,
			to: undefined,
			value: BigNumber.ZERO,
			gasPrice: 5000000000,
			gasLimit: 1000000,
			nonce: BigNumber.ZERO,
			data: '0x',
			v: 1,
			r: '8f0145edea568df2dd39db91be0bff4ebf5b1e54cae49bf2090bf84fa0dd45a2',
			s: '273f828aaa99a54e31f8f3e316acc573c6f2490fb903052accddb979647fa5ce',
		}

		const serialized = "f8538085012a05f200830f4240808080824e44a08f0145edea568df2dd39db91be0bff4ebf5b1e54cae49bf2090bf84fa0dd45a2a0273f828aaa99a54e31f8f3e316acc573c6f2490fb903052accddb979647fa5ce";

		let builder = app.resolve(TransactionBuilder);
		const txSignedWithPassphrase = await (await builder.sign(wallet.passphrase)).build();
		assert.equal(txSignedWithPassphrase.toData(), transaction);
		assert.equal(txSignedWithPassphrase.serialized.toString("hex"), serialized);
		assert.equal(await builder.getStruct(), { ...transaction, legacySecondSignature: undefined });


		builder = app.resolve(TransactionBuilder);
		const txSignedWithKeyPair = await (await builder.signWithKeyPair({ publicKey: wallet.publicKey, privateKey: wallet.privateKey, compressed: false })).build();
		assert.equal(txSignedWithKeyPair.toData(), transaction);
		assert.equal(txSignedWithKeyPair.serialized.toString("hex"), serialized);
		assert.equal(await builder.getStruct(), { ...transaction, legacySecondSignature: undefined });


		builder = app.resolve(TransactionBuilder);
		const txSignedWithWif = await (await builder.signWithWif(wallet.WIF)).build();
		assert.equal(txSignedWithWif.toData(), transaction);
		assert.equal(txSignedWithWif.serialized.toString("hex"), serialized);
		assert.equal(await builder.getStruct(), { ...transaction, legacySecondSignature: undefined });
	});

	it("#build - should work with legacy second signature", async ({ app }) => {
		const transaction = {
			hash: '64ff1ac71a06deb6a2d544786f8751b534c1c38284ccfa5faf2565d19b9f5151',
			network: 10000,
			from: wallet.address,
			senderPublicKey: wallet.publicKey,
			senderLegacyAddress: wallet.legacyAddress,
			to: undefined,
			value: BigNumber.ZERO,
			gasPrice: 5000000000,
			gasLimit: 1000000,
			nonce: BigNumber.ZERO,
			data: '0x',
			v: 1,
			r: '8f0145edea568df2dd39db91be0bff4ebf5b1e54cae49bf2090bf84fa0dd45a2',
			s: '273f828aaa99a54e31f8f3e316acc573c6f2490fb903052accddb979647fa5ce',
			legacySecondSignature: '8f0145edea568df2dd39db91be0bff4ebf5b1e54cae49bf2090bf84fa0dd45a2273f828aaa99a54e31f8f3e316acc573c6f2490fb903052accddb979647fa5ce01'
		}

		const serialized = "f8968085012a05f200830f4240808080824e44a08f0145edea568df2dd39db91be0bff4ebf5b1e54cae49bf2090bf84fa0dd45a2a0273f828aaa99a54e31f8f3e316acc573c6f2490fb903052accddb979647fa5ceb8418f0145edea568df2dd39db91be0bff4ebf5b1e54cae49bf2090bf84fa0dd45a2273f828aaa99a54e31f8f3e316acc573c6f2490fb903052accddb979647fa5ce01";

		let builder = app.resolve(TransactionBuilder);
		await builder.legacySecondSign(wallet.passphrase)
		await builder.sign(wallet.passphrase)
		const txSignedWithPassphrase = await builder.build();
		assert.equal(txSignedWithPassphrase.toData(), transaction);
		assert.equal(txSignedWithPassphrase.serialized.toString("hex"), serialized);
		assert.equal(await builder.getStruct(), transaction);

		builder = app.resolve(TransactionBuilder);
		await builder.legacySecondSignWithKeyPair({ publicKey: wallet.publicKey, privateKey: wallet.privateKey, compressed: false })
		await builder.sign(wallet.passphrase)
		const txSignedWithKeyPair = await builder.build();
		assert.equal(txSignedWithKeyPair.toData(), transaction);
		assert.equal(txSignedWithKeyPair.serialized.toString("hex"), serialized);
		assert.equal(await builder.getStruct(), transaction);

		builder = app.resolve(TransactionBuilder);
		await builder.legacySecondSignWithWif(wallet.WIF)
		await builder.sign(wallet.passphrase)
		const txSignedWithWif = await builder.build();
		assert.equal(txSignedWithWif.toData(), transaction);
		assert.equal(txSignedWithWif.serialized.toString("hex"), serialized);
		assert.equal(await builder.getStruct(), transaction);
	});
});
