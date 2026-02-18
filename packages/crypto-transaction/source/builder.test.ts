import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { TransactionBuilder } from "./builder.js";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { BigNumber } from "@mainsail/utils";
import { MissingTransactionSignatureError, ValidationFailed } from "@mainsail/exceptions";

const wallet = {
	passphrase:
		"donor assault bridge robust asthma memory thunder cruel eagle obvious act sound bounce orange donkey reform city frost mix install average country strategy rough",
	publicKey: "02f0f1217bace23ac2ac9438b65a8dcc693905bee511b49d5ade499a8c8da8a3e4",
	privateKey: "9be3cd2b0efa7b4d82d68496cf95f0a6c69155a410c7c29e6ec47b27478dec63",
	address: "0xa92D8ba95B46bcFD0177E203C515885E91DF03F4",
	legacyAddress: "DBcN6tLzebNYT9oAfXtUYS7WhSTfcfM19C",
	WIF: "Uc5K4F7w46zZV4TXcL77LoZpnEEyujnpLY995BFP58q9A7kvoQsq",
};

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
			hash: "64ff1ac71a06deb6a2d544786f8751b534c1c38284ccfa5faf2565d19b9f5151",
			network: 10000,
			from: wallet.address,
			senderPublicKey: wallet.publicKey,
			senderLegacyAddress: wallet.legacyAddress,
			to: undefined,
			value: BigNumber.ZERO,
			gasPrice: 5000000000,
			gasLimit: 1000000,
			nonce: BigNumber.ZERO,
			data: "0x",
			v: 1,
			r: "8f0145edea568df2dd39db91be0bff4ebf5b1e54cae49bf2090bf84fa0dd45a2",
			s: "273f828aaa99a54e31f8f3e316acc573c6f2490fb903052accddb979647fa5ce",
		};

		const serialized =
			"f8538085012a05f200830f4240808080824e44a08f0145edea568df2dd39db91be0bff4ebf5b1e54cae49bf2090bf84fa0dd45a2a0273f828aaa99a54e31f8f3e316acc573c6f2490fb903052accddb979647fa5ce";

		let builder = app.resolve(TransactionBuilder);
		const txSignedWithPassphrase = await (await builder.sign(wallet.passphrase)).build();
		assert.equal(txSignedWithPassphrase.toData(), transaction);
		assert.equal(txSignedWithPassphrase.serialized.toString("hex"), serialized);
		assert.equal(await builder.getStruct(), { ...transaction, legacySecondSignature: undefined });

		builder = app.resolve(TransactionBuilder);
		const txSignedWithKeyPair = await (
			await builder.signWithKeyPair({
				publicKey: wallet.publicKey,
				privateKey: wallet.privateKey,
				compressed: false,
			})
		).build();
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
			hash: "64ff1ac71a06deb6a2d544786f8751b534c1c38284ccfa5faf2565d19b9f5151",
			network: 10000,
			from: wallet.address,
			senderPublicKey: wallet.publicKey,
			senderLegacyAddress: wallet.legacyAddress,
			to: undefined,
			value: BigNumber.ZERO,
			gasPrice: 5000000000,
			gasLimit: 1000000,
			nonce: BigNumber.ZERO,
			data: "0x",
			v: 1,
			r: "8f0145edea568df2dd39db91be0bff4ebf5b1e54cae49bf2090bf84fa0dd45a2",
			s: "273f828aaa99a54e31f8f3e316acc573c6f2490fb903052accddb979647fa5ce",
			legacySecondSignature:
				"8f0145edea568df2dd39db91be0bff4ebf5b1e54cae49bf2090bf84fa0dd45a2273f828aaa99a54e31f8f3e316acc573c6f2490fb903052accddb979647fa5ce01",
		};

		const serialized =
			"f8968085012a05f200830f4240808080824e44a08f0145edea568df2dd39db91be0bff4ebf5b1e54cae49bf2090bf84fa0dd45a2a0273f828aaa99a54e31f8f3e316acc573c6f2490fb903052accddb979647fa5ceb8418f0145edea568df2dd39db91be0bff4ebf5b1e54cae49bf2090bf84fa0dd45a2273f828aaa99a54e31f8f3e316acc573c6f2490fb903052accddb979647fa5ce01";

		let builder = app.resolve(TransactionBuilder);
		await builder.legacySecondSign(wallet.passphrase);
		await builder.sign(wallet.passphrase);
		const txSignedWithPassphrase = await builder.build();
		assert.equal(txSignedWithPassphrase.toData(), transaction);
		assert.equal(txSignedWithPassphrase.serialized.toString("hex"), serialized);
		assert.equal(await builder.getStruct(), transaction);

		builder = app.resolve(TransactionBuilder);
		await builder.legacySecondSignWithKeyPair({
			publicKey: wallet.publicKey,
			privateKey: wallet.privateKey,
			compressed: false,
		});
		await builder.sign(wallet.passphrase);
		const txSignedWithKeyPair = await builder.build();
		assert.equal(txSignedWithKeyPair.toData(), transaction);
		assert.equal(txSignedWithKeyPair.serialized.toString("hex"), serialized);
		assert.equal(await builder.getStruct(), transaction);

		builder = app.resolve(TransactionBuilder);
		await builder.legacySecondSignWithWif(wallet.WIF);
		await builder.sign(wallet.passphrase);
		const txSignedWithWif = await builder.build();
		assert.equal(txSignedWithWif.toData(), transaction);
		assert.equal(txSignedWithWif.serialized.toString("hex"), serialized);
		assert.equal(await builder.getStruct(), transaction);
	});

	it("#sign - should throw on schema error", async ({ app }) => {
		let builder = app.resolve(TransactionBuilder);
		await assert.rejects(() => builder.nonce("-1").sign(wallet.passphrase), ValidationFailed);
	});

	it("#legacySecondSign - should throw on schema error", async ({ app }) => {
		let builder = app.resolve(TransactionBuilder);
		await assert.rejects(() => builder.nonce("-1").legacySecondSign(wallet.passphrase), ValidationFailed);
	});

	it("#getStruct - should throw on missing data", async ({ app }) => {
		let builder = app.resolve(TransactionBuilder);
		await assert.rejects(() => builder.getStruct(), MissingTransactionSignatureError);
	});

	it("#verify - should verify hash", async ({ app }) => {
		let builder = app.resolve(TransactionBuilder);
		assert.false(await builder.verify());

		await builder.sign(wallet.passphrase);
		assert.true(await builder.verify());
	});

	it("should work with modifiers", async ({ app }) => {
		const transaction = {
			hash: "e02f8d66bf5166568f052d8727c60694b3f449b61663214a37542326079fec50",
			network: 10000,
			from: wallet.address,
			senderPublicKey: wallet.publicKey,
			senderLegacyAddress: wallet.legacyAddress,
			to: wallet.address,
			value: BigNumber.ONE,
			gasPrice: 6000000000,
			gasLimit: 2_000_000,
			nonce: BigNumber.ONE,
			data: "0x001122",
			v: 1,
			r: "f1f325baf58dcfea7a5b3f9c4bb2e36368e9599a810ab2641089dc455fc6e6e3",
			s: "4c7fe815a8b1d953ab9e5e58fc4a0cecba73904ad1ceb7af7626ac4bf9fb69f5",
		};

		const serialized =
			"f86a01850165a0bc00831e848094a92d8ba95b46bcfd0177e203c515885e91df03f40183001122824e44a0f1f325baf58dcfea7a5b3f9c4bb2e36368e9599a810ab2641089dc455fc6e6e3a04c7fe815a8b1d953ab9e5e58fc4a0cecba73904ad1ceb7af7626ac4bf9fb69f5";

		let builder = app.resolve(TransactionBuilder);
		builder.nonce("1");
		builder.gasPrice(6 * 1e9);
		builder.gasLimit(2_000_000);
		builder.value("1");
		builder.recipientAddress(wallet.address);
		builder.payload("0x001122");
		await builder.sign(wallet.passphrase);

		const tx = await builder.build();
		console.log(tx.serialized.toString("hex"));
		assert.equal(tx.toData(), transaction);
		assert.equal(tx.serialized.toString("hex"), serialized);
		assert.equal(await builder.getStruct(), { ...transaction, legacySecondSignature: undefined });
	});

	it("#network - should set network", async ({ app }) => {
		let builder = app.resolve(TransactionBuilder);

		assert.equal(builder.data.network, 10000);

		builder.network(12345);
		assert.equal(builder.data.network, 12345);
	});

	it("#payload - should add 0x prefix if missing", async ({ app }) => {
		let builder = app.resolve(TransactionBuilder);
		builder.payload("001122");
		assert.equal(builder.data.data, "0x001122");

		builder.payload("0x00112233");
		assert.equal(builder.data.data, "0x00112233");
	});
});
