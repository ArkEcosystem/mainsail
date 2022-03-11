import { describe, Factories, Generators } from "@arkecosystem/core-test-framework";
import { TransactionVersionError } from "../../../errors";
import { Address, Keys } from "../../../identities";
import { configManager } from "../../../managers";
import { BuilderFactory, Signer } from "../../index";
import { BigNumber } from "../../../utils/bignum";
import { NetworkConfig } from "../../../interfaces";

describe<{
	originalConfig: NetworkConfig;
	config: any;
	identity: any;
	identitySecond: any;
	data: any;
	nonce: BigNumber;
}>("TransactionBuilder", ({ it, assert, beforeAll, beforeEach, afterAll, stub, spy }) => {
	beforeAll((context) => {
		context.originalConfig = configManager.all();

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		context.config = Generators.generateCryptoConfigRaw();

		configManager.setConfig(context.config);

		context.nonce = BigNumber.make(0);

		context.data = {
			id: "02d0d835266297f15c192be2636eb3fbc30b39b87fc583ff112062ef8dae1a1f",
			amount: BigNumber.ONE,
			fee: BigNumber.ONE,
			recipientId: "AZT6b2Vm6VgNF7gW49M4wvUVBBntWxdCj5",
			senderPublicKey: "039180ea4a8a803ee11ecb462bb8f9613fcdb5fe917e292dbcc73409f0e98f8f22",
			nonce: context.nonce,
			type: 0,
			version: 0x02,
		};
	});

	beforeEach((context) => {
		context.identity = Factories.factory("Identity")
			.withOptions({ passphrase: "this is a top secret passphrase", network: context.config.network })
			.make();

		context.identitySecond = Factories.factory("Identity")
			.withOptions({ passphrase: "this is a top secret second passphrase", network: context.config.network })
			.make();
	});

	afterAll((context) => {
		configManager.setConfig(context.originalConfig);
	});

	for (const provider of [
		BuilderFactory.transfer,
		BuilderFactory.delegateRegistration,
		BuilderFactory.vote,
		BuilderFactory.multiSignature,
		BuilderFactory.multiPayment,
		BuilderFactory.delegateResignation,
	]) {
		it(`[${provider}] - [inherits TransactionBuilder] should have the essential properties`, (context) => {
			const builder = provider();

			assert.undefined(builder.data.id);
			assert.true(builder.data.hasOwnProperty("timestamp"));
			assert.true(builder.data.hasOwnProperty("version"));

			assert.true(builder.data.hasOwnProperty("type"));
			assert.true(builder.data.hasOwnProperty("fee"));
		});

		it(`[${provider}] - [inherits TransactionBuilder] builder - should return a Transaction model with the builder data`, (context) => {
			const builder = provider();

			builder.data = context.data;

			const transaction = builder.build();

			assert.equal(transaction.type, 0);
			assert.equal(transaction.data.amount, BigNumber.ONE);
			assert.equal(transaction.data.fee, BigNumber.ONE);
			assert.equal(transaction.data.recipientId, "AZT6b2Vm6VgNF7gW49M4wvUVBBntWxdCj5");
			assert.equal(
				transaction.data.senderPublicKey,
				"039180ea4a8a803ee11ecb462bb8f9613fcdb5fe917e292dbcc73409f0e98f8f22",
			);
			assert.equal(transaction.data.nonce, context.nonce);
			assert.equal(transaction.data.version, 0x02);
		});

		it(`[${provider}] - [inherits TransactionBuilder] builder - could merge and override the builder data`, (context) => {
			const builder = provider();

			builder.data = context.data;

			const transaction = builder.build({
				amount: BigNumber.make(33),
				fee: BigNumber.make(1000),
			});

			assert.equal(transaction.data.amount, BigNumber.make(33));
			assert.equal(transaction.data.fee, BigNumber.make(1000));
			assert.equal(transaction.data.recipientId, "AZT6b2Vm6VgNF7gW49M4wvUVBBntWxdCj5");
			assert.equal(
				transaction.data.senderPublicKey,
				"039180ea4a8a803ee11ecb462bb8f9613fcdb5fe917e292dbcc73409f0e98f8f22",
			);
			assert.equal(transaction.data.nonce, context.nonce);
			assert.equal(transaction.data.version, 0x02);
		});

		it(`[${provider}] - [inherits TransactionBuilder] fee - should set the fee`, (context) => {
			const builder = provider();

			builder.fee("255");
			assert.equal(builder.data.fee, BigNumber.make(255));
		});

		it(`[${provider}] - [inherits TransactionBuilder] amount - should set the amount`, (context) => {
			const builder = provider();

			builder.amount("255");
			assert.equal(builder.data.amount, BigNumber.make(255));
		});

		it(`[${provider}] - [inherits TransactionBuilder] recipientId - should set the recipient id`, (context) => {
			const builder = provider();

			builder.recipientId("fake");
			assert.equal(builder.data.recipientId, "fake");
		});

		it(`[${provider}] - [inherits TransactionBuilder] senderPublicKey - should set the sender public key`, (context) => {
			const builder = provider();

			builder.senderPublicKey("fake");
			assert.equal(builder.data.senderPublicKey, "fake");
		});

		it(`[${provider}] - sign - signs this transaction with the keys of the passphrase`, (context) => {
			const builder = provider();

			const spyKeys = stub(Keys, "fromPassphrase").returnValueOnce(context.identity.keys);
			const spySign = spy(Signer, "sign");

			builder.sign(context.identity.bip39);

			spyKeys.calledWith(context.identity.bip39);
			spySign.calledWith((builder as any).getSigningObject(), context.identity.keys, {
				disableVersionCheck: false,
			});
		});

		it(`[${provider}] - sign - establishes the public key of the sender`, (context) => {
			const spyKeys = stub(Keys, "fromPassphrase").returnValueOnce(context.identity.keys);
			const spySign = spy(Signer, "sign");

			const builder = provider();
			builder.sign(context.identity.bip39);

			assert.equal(builder.data.senderPublicKey, context.identity.keys.publicKey);
			spyKeys.calledWith(context.identity.bip39);
			spySign.calledWith((builder as any).getSigningObject(), context.identity.keys, {
				disableVersionCheck: false,
			});
		});

		it(`[${provider}] - signWithWif - signs this transaction with keys from a wif`, (context) => {
			const spyKeys = stub(Keys, "fromWIF").returnValueOnce(context.identity.keys);
			const spySign = spy(Signer, "sign");

			const builder = provider();
			builder.signWithWif(context.identity.bip39);

			spyKeys.calledWith(context.identity.bip39, {
				wif: 186,
			});
			spySign.calledWith((builder as any).getSigningObject(), context.identity.keys, {
				disableVersionCheck: false,
			});
		});

		it(`[${provider}] - signWithWif - establishes the public key of the sender`, (context) => {
			const spySign = spy(Signer, "sign");

			const builder = provider();
			builder.signWithWif(context.identity.wif);

			assert.equal(builder.data.senderPublicKey, context.identity.publicKey);
			spySign.calledWith((builder as any).getSigningObject(), context.identity.keys, {
				disableVersionCheck: false,
			});
		});

		it(`[${provider}] - multiSignWithWif - signs this transaction with the keys of a multisig wif`, (context) => {
			const spyKeys = stub(Keys, "fromWIF").returnValueOnce(context.identitySecond.keys);
			const spyMultiSign = spy(Signer, "multiSign");

			const builder = provider();
			builder
				.senderPublicKey(context.identity.publicKey)
				.multiSignWithWif(0, context.identitySecond.bip39, undefined);

			spyKeys.calledWith(context.identitySecond.bip39, {
				wif: 186,
			});
			spyMultiSign.calledWith((builder as any).getSigningObject(), context.identitySecond.keys, 0);
		});
	}

	it("should not throw transaction version error when specifically setting version 1 and aip11 is false", () => {
		configManager.setFromPreset("devnet");
		configManager.getMilestone().aip11 = false;

		const recipientAddress = Address.fromPassphrase("recipient's secret");
		const transaction = BuilderFactory.transfer().version(1).amount("100").recipientId(recipientAddress);

		let signedTransaction;
		assert.not.throws(
			() => (signedTransaction = transaction.sign("sender's secret")),
			(err) => err instanceof TransactionVersionError,
		);
		assert.equal(signedTransaction.data.version, 1);
		assert.not.throws(
			() => signedTransaction.build(),
			(err) => err instanceof TransactionVersionError,
		);
	});

	it("should not throw transaction version error when specifically setting version 1 and aip11 is true", () => {
		configManager.setFromPreset("devnet");
		configManager.getMilestone().aip11 = true;

		const recipientAddress = Address.fromPassphrase("recipient's secret");
		const transaction = BuilderFactory.transfer().version(1).amount("100").recipientId(recipientAddress);

		let signedTransaction;
		assert.not.throws(
			() => (signedTransaction = transaction.sign("sender's secret")),
			(err) => err instanceof TransactionVersionError,
		);
		assert.equal(signedTransaction.data.version, 1);
		assert.not.throws(
			() => signedTransaction.build(),
			(err) => err instanceof TransactionVersionError,
		);
	});

	it("should not throw transaction version error when specifically setting version 2 and aip11 is false", () => {
		configManager.setFromPreset("devnet");
		configManager.getMilestone().aip11 = false;

		const recipientAddress = Address.fromPassphrase("recipient's secret");
		const transaction = BuilderFactory.transfer().version(2).amount("100").recipientId(recipientAddress);

		let signedTransaction;

		assert.not.throws(
			() => (signedTransaction = transaction.sign("sender's secret")),
			(err) => err instanceof TransactionVersionError,
		);
		assert.equal(signedTransaction.data.version, 2);
		assert.not.throws(
			() => signedTransaction.build(),
			(err) => err instanceof TransactionVersionError,
		);
	});

	it("should not throw transaction version error when specifically setting version 2 and aip11 is true", () => {
		configManager.setFromPreset("devnet");
		configManager.getMilestone().aip11 = true;

		const recipientAddress = Address.fromPassphrase("recipient's secret");
		const transaction = BuilderFactory.transfer().version(2).amount("100").recipientId(recipientAddress);

		let signedTransaction;

		assert.not.throws(
			() => (signedTransaction = transaction.sign("sender's secret")),
			(err) => err instanceof TransactionVersionError,
		);
		assert.equal(signedTransaction.data.version, 2);

		assert.not.throws(
			() => signedTransaction.build(),
			(err) => err instanceof TransactionVersionError,
		);
	});

	it("should throw transaction version error when no version is specified, but it is version 1 and we have reached aip11", () => {
		configManager.setFromPreset("devnet");
		configManager.getMilestone().aip11 = false;

		const recipientAddress = Address.fromPassphrase("recipient's secret");
		const transaction = BuilderFactory.transfer().amount("100").recipientId(recipientAddress);
		configManager.getMilestone().aip11 = true;

		assert.throws(
			() => transaction.sign("sender's secret"),
			(err) => err instanceof TransactionVersionError,
		);
	});

	it("should throw transaction version error when no version is specified, but it is version 2 and we have not reached aip11", () => {
		configManager.setFromPreset("devnet");
		configManager.getMilestone().aip11 = true;

		const recipientAddress = Address.fromPassphrase("recipient's secret");
		const transaction = BuilderFactory.transfer().amount("100").recipientId(recipientAddress);
		configManager.getMilestone().aip11 = false;

		assert.throws(
			() => transaction.sign("sender's secret"),
			(err) => err instanceof TransactionVersionError,
		);
	});
});
