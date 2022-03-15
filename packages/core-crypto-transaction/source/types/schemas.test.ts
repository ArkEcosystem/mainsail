import { describe, Generators } from "@arkecosystem/core-test-framework";

import { ARKTOSHI } from "../constants";
import { TransactionType, TransactionTypeGroup } from "../enums";
import { PublicKey } from "../identities";
import { Utils } from "../index";
import { IMultiSignatureAsset, NetworkConfig } from "../interfaces";
import { configManager } from "../managers";
import { BuilderFactory } from "../transactions";
import { TransactionTypeFactory } from "../transactions";
import { schemas } from "../transactions/types";
import { TransactionSchema } from "../transactions/types/schemas";
import { validator as Ajv } from "../validation";
import { DelegateRegistrationBuilder } from "./builders/transactions/delegate-registration";
import { MultiPaymentBuilder } from "./builders/transactions/multi-payment";
import { MultiSignatureBuilder } from "./builders/transactions/multi-signature";
import { TransferBuilder } from "./builders/transactions/transfer";
import { VoteBuilder } from "./builders/transactions/vote";

const signTransaction = (tx: MultiSignatureBuilder, values: string[]): void => {
	values.map((value, index) => tx.multiSign(value, index));
};

describe<{
	address: string;
	fee: number;
	amount: string;
	transaction: TransferBuilder;
	transactionSchema: TransactionSchema;
}>("Transfer Transaction", ({ it, beforeAll, beforeEach, assert }) => {
	beforeAll((context) => {
		context.transactionSchema = TransactionTypeFactory.get(TransactionType.Transfer).getSchema();

		context.address = "DTRdbaUW3RQQSL5By4G43JVaeHiqfVp9oh";
		context.fee = 1 * ARKTOSHI;
		context.amount = (10 * ARKTOSHI).toString();
	});

	beforeEach((context) => {
		context.transaction = BuilderFactory.transfer();
	});

	it("should be valid", (context) => {
		context.transaction.recipientId(context.address).amount(context.amount).sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.undefined(error);
	});

	it("should be valid with correct data", (context) => {
		context.transaction
			.recipientId(context.address)
			.amount(context.amount)
			.fee(Utils.BigNumber.make(context.fee).toFixed())
			.vendorField("Ahoy")
			.sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.undefined(error);
	});

	it("should be valid with up to 64 bytes in vendor field", (context) => {
		context.transaction
			.recipientId(context.address)
			.amount(context.amount)
			.fee(Utils.BigNumber.make(context.fee).toFixed())
			.vendorField("a".repeat(64))
			.sign("passphrase");
		let { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.undefined(error);

		context.transaction
			.recipientId(context.address)
			.amount(context.amount)
			.fee(Utils.BigNumber.make(context.fee).toFixed())
			.vendorField("⊁".repeat(21))
			.sign("passphrase");

		error = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct()).error;
		assert.undefined(error);
	});

	it("should be invalid with more than 64 bytes in vendor field", (context) => {
		context.transaction
			.recipientId(context.address)
			.amount(context.amount)
			.fee(Utils.BigNumber.make(context.fee).toFixed());

		// Bypass vendorfield check by manually assigning a vendorfield > 64 bytes
		context.transaction.data.vendorField = "a".repeat(65);
		context.transaction.sign("passphrase");

		let { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);

		context.transaction
			.recipientId(context.address)
			.amount(context.amount)
			.fee(Utils.BigNumber.make(context.fee).toFixed());

		// Bypass vendorfield check by manually assigning a vendorfield > 64 bytes
		context.transaction.data.vendorField = "⊁".repeat(22);
		context.transaction.sign("passphrase");

		error = Ajv.validate(context.transactionSchema.$id, context.transaction.data);
		assert.defined(error);
	});

	it("should be invalid due to no transaction as object", (context) => {
		const { error } = Ajv.validate(context.transactionSchema.$id, "test");
		assert.defined(error);
	});

	it("should be invalid due to no address", (context) => {
		context.transaction.recipientId(undefined).amount(context.amount).sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to invalid address", (context) => {
		context.transaction.recipientId(context.address).amount(context.amount).sign("passphrase");

		const struct = context.transaction.getStruct();
		struct.recipientId = "woop";

		const { error } = Ajv.validate(context.transactionSchema.$id, struct);
		assert.defined(error);
	});

	it("should be invalid due to zero amount", (context) => {
		context.transaction.recipientId(context.address).amount(0).sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to zero fee", (context) => {
		context.transaction.recipientId(context.address).amount("1").fee("0").sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to wrong transaction type", (context) => {
		const transaction = BuilderFactory.delegateRegistration();
		transaction.usernameAsset("delegate_name").sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, transaction.getStruct());
		assert.defined(error);
	});

	it("should be valid due to missing network byte", (context) => {
		context.transaction.recipientId(context.address).amount("1").fee("1").sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.undefined(error);
	});

	it("should be valid due to correct network byte", (context) => {
		context.transaction
			.recipientId(context.address)
			.amount("1")
			.fee("1")
			.network(configManager.get("network.pubKeyHash"))
			.sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.undefined(error);
	});

	it("should be invalid due to wrong network byte", (context) => {
		context.transaction.recipientId(context.address).amount("1").fee("1").network(1).sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be valid after a network change", (context) => {
		configManager.setFromPreset("devnet");

		let transfer = context.transaction
			.recipientId(context.address)
			.amount("1")
			.fee("1")
			.network(configManager.get("network.pubKeyHash"))
			.sign("passphrase")
			.build();

		assert.equal(transfer.data.network, 30);

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.undefined(error);

		configManager.setFromPreset("mainnet");

		transfer = context.transaction
			.version(1)
			.recipientId("APnDzjtDb1FthuqcLMeL5XMWb1uD1KeMGi")
			.amount("1")
			.fee("1")
			.network(configManager.get("network.pubKeyHash"))
			.sign("passphrase")
			.build();

		assert.equal(transfer.data.network, 23);
		assert.undefined(Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct()).error);
	});

	it("should be ok and turn uppercase publicKey to lowercase", (context) => {
		const transfer = context.transaction
			.recipientId(context.address)
			.amount("1")
			.fee("1")
			.network(configManager.get("network.pubKeyHash"))
			.sign("passphrase")
			.build();

		const { senderPublicKey } = transfer.data;

		transfer.data.senderPublicKey = senderPublicKey.toUpperCase();
		assert.not.equal(transfer.data.senderPublicKey, senderPublicKey);

		const { value, error } = Ajv.validate(context.transactionSchema.$id, transfer.data);
		assert.undefined(error);
		assert.equal(value.senderPublicKey, senderPublicKey);
	});
});

describe<{
	transaction: DelegateRegistrationBuilder;
	transactionSchema: TransactionSchema;
}>("Delegate Registration Transaction", ({ it, assert, beforeAll, beforeEach }) => {
	beforeAll((context) => {
		context.transactionSchema = TransactionTypeFactory.get(TransactionType.DelegateRegistration).getSchema();
	});

	beforeEach((context) => {
		context.transaction = BuilderFactory.delegateRegistration();
	});

	it("should be valid", (context) => {
		context.transaction.usernameAsset("delegate1").sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.undefined(error);
	});

	it("should be invalid due to no transaction as object", (context) => {
		const { error } = Ajv.validate(context.transactionSchema.$id, {});
		assert.defined(error);
	});

	it("should be invalid due to non-zero amount", (context) => {
		context.transaction
			.usernameAsset("delegate1")
			.amount((10 * ARKTOSHI).toString())
			.sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to zero fee", (context) => {
		context.transaction.usernameAsset("delegate1").fee("0").sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to space in username", (context) => {
		context.transaction.usernameAsset("test 123").sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to non-alphanumeric in username", (context) => {
		context.transaction.usernameAsset("£££").sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to username too long", (context) => {
		context.transaction.usernameAsset("1234567890123456789012345").sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to undefined username", (context) => {
		context.transaction.usernameAsset("bla").sign("passphrase");
		const struct = context.transaction.getStruct();
		struct.asset.delegate.username = undefined;
		const { error } = Ajv.validate(context.transactionSchema.$id, struct);
		assert.defined(error);
	});

	it("should be invalid due to no username", (context) => {
		context.transaction.usernameAsset("").sign("passphrase");
		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to capitals in username", (context) => {
		context.transaction.usernameAsset("I_AM_INVALID").sign("passphrase");
		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to transaction type", (context) => {
		const transaction = BuilderFactory.transfer();
		transaction
			.recipientId(undefined)
			.amount((10 * ARKTOSHI).toString())
			.sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, transaction.getStruct());
		assert.defined(error);
	});
});

describe<{
	vote: string;
	unvote: string;
	votes: string[];
	invalidVotes: string[];
	transaction: VoteBuilder;
	transactionSchema: TransactionSchema;
}>("Vote Transaction", ({ it, assert, beforeAll, beforeEach }) => {
	beforeAll((context) => {
		context.transactionSchema = TransactionTypeFactory.get(TransactionType.Vote).getSchema();

		context.vote = "+02bcfa0951a92e7876db1fb71996a853b57f996972ed059a950d910f7d541706c9";
		context.unvote = "-0326580718fc86ba609799ac95fcd2721af259beb5afa81bfce0ab7d9fe95de991";
		context.votes = [
			context.vote,
			"+0310ad026647eed112d1a46145eed58b8c19c67c505a67f1199361a511ce7860c0",
			context.unvote,
		];
		context.invalidVotes = [
			"02bcfa0951a92e7876db1fb71996a853b57f996972ed059a950d910f7d541706c9",
			"0310ad026647eed112d1a46145eed58b8c19c67c505a67f1199361a511ce7860c0",
			"0326580718fc86ba609799ac95fcd2721af259beb5afa81bfce0ab7d9fe95de991",
		];
	});

	beforeEach((context) => {
		context.transaction = BuilderFactory.vote();
	});

	it("should be valid with 1 vote", (context) => {
		context.transaction.votesAsset([context.vote]).sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.undefined(error);
	});

	it("should be valid with 1 unvote", (context) => {
		context.transaction.votesAsset([context.unvote]).sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.undefined(error);
	});

	it("should be invalid due to no transaction as object", (context) => {
		const { error } = Ajv.validate(context.transactionSchema.$id, "test");
		assert.defined(error);
	});

	it("should be invalid due to non-zero amount", (context) => {
		context.transaction
			.votesAsset([context.vote])
			.amount((10 * ARKTOSHI).toString())
			.sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to zero fee", (context) => {
		context.transaction.votesAsset(context.votes).fee("0").sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to no votes", (context) => {
		context.transaction.votesAsset([]).sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to more than 1 vote", (context) => {
		context.transaction.votesAsset(context.votes).sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to invalid votes", (context) => {
		context.transaction.votesAsset(context.invalidVotes).sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to wrong vote type", (context) => {
		const struct = context.transaction.sign("passphrase").getStruct();
		// @ts-ignore
		struct.asset.votes = context.vote;

		const { error } = Ajv.validate(context.transactionSchema.$id, struct);
		assert.defined(error);
	});

	it("should be invalid due to wrong transaction type", (context) => {
		const wrongTransaction = BuilderFactory.delegateRegistration();
		wrongTransaction.usernameAsset("delegate_name").sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, wrongTransaction.getStruct());
		assert.defined(error);
	});
});

describe<{
	config: NetworkConfig;
	passphrase: string;
	publicKey: string;
	passphrases: string[];
	participants: string[];
	transactionSchema: TransactionSchema;
	transaction: MultiSignatureBuilder;
	multiSignatureAsset: IMultiSignatureAsset;
}>("Multi Signature Registration Transaction", ({ it, assert, beforeAll, beforeEach, afterAll }) => {
	beforeAll((context) => {
		context.config = configManager.all();

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		configManager.setConfig(Generators.generateCryptoConfigRaw());

		context.passphrase = "passphrase 1";
		context.publicKey = "03e8021105a6c202097e97e6c6d650942d913099bf6c9f14a6815df1023dde3b87";
		context.passphrases = [context.passphrase, "passphrase 2", "passphrase 3"];
		context.participants = [
			context.publicKey,
			"03dfdaaa7fd28bc9359874b7e33138f4d0afe9937e152c59b83a99fae7eeb94899",
			"03de72ef9d3ebf1b374f1214f5b8dde823690ab2aa32b4b8b3226cc568aaed1562",
		];

		context.transactionSchema = TransactionTypeFactory.get(
			TransactionType.MultiSignature,
			TransactionTypeGroup.Core,
			2,
		).getSchema();
	});

	beforeEach((context) => {
		context.transaction = BuilderFactory.multiSignature();
		context.multiSignatureAsset = {
			min: 3,
			publicKeys: context.participants,
		};
	});

	afterAll((context) => {
		configManager.setConfig(context.config);
		// configManager.setFromPreset("devnet");
	});

	it("should be valid with min of 3", (context) => {
		context.multiSignatureAsset.min = 3;
		context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");
		signTransaction(context.transaction, context.passphrases);

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.undefined(error);
	});

	it("should be valid with 3 public keys", (context) => {
		context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");
		signTransaction(context.transaction, context.passphrases);

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.undefined(error);
	});

	it("should be valid with a dynamic number of signatures between min and publicKeys ", (context) => {
		context.multiSignatureAsset.min = 1;
		for (const count of [1, 2, 3]) {
			context.transaction.data.signatures = [];
			context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");
			signTransaction(context.transaction, context.passphrases.slice(0, count));

			const struct = context.transaction.getStruct();
			const { error } = Ajv.validate(context.transactionSchema.$id, struct);
			assert.undefined(error);
		}
	});

	it("should be invalid due to no transaction as object", (context) => {
		const { error } = Ajv.validate(context.transactionSchema.$id, "test");
		assert.defined(error);
	});

	it("should be invalid due to non-zero amount", (context) => {
		context.transaction
			.multiSignatureAsset(context.multiSignatureAsset)
			.amount((10 * ARKTOSHI).toString())
			.sign("passphrase");
		signTransaction(context.transaction, context.passphrases);

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to zero fee", (context) => {
		context.transaction.multiSignatureAsset(context.multiSignatureAsset).fee("0").sign("passphrase");
		signTransaction(context.transaction, context.passphrases);

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to min too low", (context) => {
		context.multiSignatureAsset.min = 0;
		context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");
		signTransaction(context.transaction, context.passphrases);

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to min too high", (context) => {
		context.multiSignatureAsset.min = context.multiSignatureAsset.publicKeys.length + 1;
		context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");
		signTransaction(context.transaction, context.passphrases);

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to no public keys", (context) => {
		context.multiSignatureAsset.publicKeys = [];
		context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");
		signTransaction(context.transaction, context.passphrases);

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to too many public keys", (context) => {
		const values = [];
		context.multiSignatureAsset.publicKeys = [];
		for (let i = 0; i < 20; i++) {
			const value = `passphrase ${i}`;
			values.push(value);
			context.multiSignatureAsset.publicKeys.push(PublicKey.fromPassphrase(value));
		}

		context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");
		signTransaction(context.transaction, values);

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to duplicate public keys", (context) => {
		context.multiSignatureAsset.publicKeys = [context.publicKey, context.publicKey];
		context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");
		signTransaction(context.transaction, context.passphrases);

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to no signatures", (context) => {
		context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to empty signatures", (context) => {
		context.multiSignatureAsset.min = 1;
		context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");
		signTransaction(context.transaction, []);

		const struct = context.transaction.getStruct();
		struct.signatures = [];
		const { error } = Ajv.validate(context.transactionSchema.$id, struct);
		assert.defined(error);
	});

	it("should be invalid due to not enough signatures", (context) => {
		context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");
		signTransaction(context.transaction, context.passphrases.slice(1));

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to too many signatures", (context) => {
		context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");
		signTransaction(context.transaction, ["wrong passphrase", ...context.passphrases]);

		const { error } = Ajv.validate(context.transactionSchema.$id, context.transaction.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to too few publicKeys", (context) => {
		context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");
		signTransaction(context.transaction, context.passphrases);

		const struct = context.transaction.getStruct();
		struct.asset.multiSignature.publicKeys = struct.asset.multiSignature.publicKeys.slice(1);
		const { error } = Ajv.validate(context.transactionSchema.$id, struct);
		assert.defined(error);
	});

	it("should be invalid due to malformed for publicKeys", (context) => {
		context.transaction.multiSignatureAsset(context.multiSignatureAsset).sign("passphrase");
		signTransaction(context.transaction, context.passphrases);

		const struct = context.transaction.getStruct();
		struct.asset.multiSignature.publicKeys = context.participants.map((value) => `-${value.slice(1)}`);
		let { error } = Ajv.validate(context.transactionSchema.$id, struct);
		assert.defined(error);

		struct.asset.multiSignature.publicKeys = context.participants.map((value) => "a");
		error = Ajv.validate(context.transactionSchema.$id, struct).error;
		assert.defined(error);
	});

	it("should be invalid due to wrong transaction type", (context) => {
		const transaction = BuilderFactory.delegateRegistration();
		transaction.usernameAsset("delegate_name").sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, transaction.getStruct());
		assert.defined(error);
	});

	it("should validate legacy multisignature", (context) => {
		const legacyMultiSignature = {
			version: 1,
			network: 23,
			type: 4,
			timestamp: 53_253_482,
			senderPublicKey: "0333421e69d3531a1c43c43cd4b9344e5a10640644a5fd35618b6306f3a4d7f208",
			fee: "2000000000",
			amount: "0",
			asset: {
				multiSignatureLegacy: {
					keysgroup: [
						"+034da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126",
						"+0310c283aac7b35b4ae6fab201d36e8322c3408331149982e16013a5bcb917081c",
						"+0392a762e0123945455b7afe675e5ab98fb1586de43e5682514b9454d6edced724",
					],
					lifetime: 24,
					min: 2,
				},
			},
			signature:
				"304402206009fbf8592e2e3485bc0aa84dbbc8c78326d59191daf870693bc3446b5eeeee02200b4ff5dd53b1e337fe6fbe090f42337dcfc4242c802c340815326e3858d13d6b",
			id: "32aa60577531c190e6a29d28f434367c84c2f0a62eceba5c5483a3983639d51a",
		};

		const { error } = Ajv.validate(schemas.multiSignatureLegacy, legacyMultiSignature);
		assert.undefined(error);
	});
});

describe<{
	address: string;
	transactionSchema: TransactionSchema;
	multiPayment: MultiPaymentBuilder;
}>("Multi Payment Transaction", ({ it, assert, beforeAll, beforeEach }) => {
	beforeAll((context) => {
		context.transactionSchema = TransactionTypeFactory.get(TransactionType.MultiPayment).getSchema();
		context.address = "DTRdbaUW3RQQSL5By4G43JVaeHiqfVp9oh";
	});

	beforeEach((context) => {
		context.multiPayment = BuilderFactory.multiPayment().fee("1");
	});

	it("should be valid with 2 payments", (context) => {
		context.multiPayment.addPayment(context.address, "150").addPayment(context.address, "100").sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.multiPayment.getStruct());
		assert.undefined(error);
	});

	it("should be invalid with 0 or 1 payment", (context) => {
		context.multiPayment.sign("passphrase");
		const { error: errorZeroPayment } = Ajv.validate(context.transactionSchema.$id, context.multiPayment.data);
		assert.defined(errorZeroPayment);

		context.multiPayment.addPayment(context.address, "100").sign("passphrase");

		const { error: errorOnePayment } = Ajv.validate(context.transactionSchema.$id, context.multiPayment.data);
		assert.defined(errorOnePayment);
	});

	it("should not accept more than `multiPaymentLimit` payments", (context) => {
		const limit = configManager.getMilestone().multiPaymentLimit;

		for (let i = 0; i < limit; i++) {
			context.multiPayment.addPayment(context.address, `${i + 1}`);
		}

		context.multiPayment.data.asset.payments.push({ amount: Utils.BigNumber.ONE, recipientId: context.address });
		context.multiPayment.sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.multiPayment.data);
		assert.defined(error);

		configManager.getMilestone().multiPaymentLimit = 10;
		context.multiPayment.data.asset.payments = context.multiPayment.data.asset.payments.slice(0, 50);
		assert.defined(Ajv.validate(context.transactionSchema.$id, context.multiPayment.data).error);

		context.multiPayment.data.asset.payments = context.multiPayment.data.asset.payments.slice(0, 10);
		assert.undefined(Ajv.validate(context.transactionSchema.$id, context.multiPayment.data).error);

		configManager.getMilestone().multiPaymentLimit = 2;
		assert.defined(Ajv.validate(context.transactionSchema.$id, context.multiPayment.data).error);

		context.multiPayment.data.asset.payments = [
			{ amount: Utils.BigNumber.ONE, recipientId: context.address },
			{ amount: Utils.BigNumber.ONE, recipientId: context.address },
		];

		assert.undefined(Ajv.validate(context.transactionSchema.$id, context.multiPayment.data).error);
		configManager.getMilestone().multiPaymentLimit = limit;
		assert.undefined(Ajv.validate(context.transactionSchema.$id, context.multiPayment.data).error);
	});

	it("should be invalid due to zero fee", (context) => {
		context.multiPayment
			.addPayment(context.address, "150")
			.addPayment(context.address, "100")
			.fee("0")
			.sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, context.multiPayment.getStruct());
		assert.defined(error);
	});

	it("should be invalid due to wrong transaction type", (context) => {
		const transaction = BuilderFactory.delegateRegistration();
		transaction.usernameAsset("delegate_name").sign("passphrase");

		const { error } = Ajv.validate(context.transactionSchema.$id, transaction.getStruct());
		assert.defined(error);
	});
});
