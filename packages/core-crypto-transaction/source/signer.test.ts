import { describe, Generators } from "@arkecosystem/core-test-framework";
import { TransactionFactory } from "@arkecosystem/core-test-framework/source/utils/transaction-factory";
import { TransactionVersionError } from "../errors";
import { Keys } from "../identities";
import { IKeyPair, ITransactionData, NetworkConfig } from "../interfaces";
import { configManager } from "../managers";
import { Signer } from "./signer";

describe<{
	config: NetworkConfig;
	transaction: ITransactionData;
	keys: IKeyPair;
}>("Signer", ({ it, beforeAll, afterAll, assert }) => {
	beforeAll((context) => {
		context.config = configManager.all();

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		configManager.setConfig(Generators.generateCryptoConfigRaw());

		context.keys = Keys.fromPassphrase("secret");
		context.transaction = TransactionFactory.initialize()
			.transfer("AJWRd23HNEhPLkK1ymMnwnDBX2a7QBZqff", 1000)
			.withVersion(2)
			.withFee(2000)
			.withPassphrase("secret")
			.createOne();
	});

	afterAll((context) => {
		configManager.setConfig(context.config);
	});

	it("should return a valid signature", (context) => {
		const signature = Signer.sign(context.transaction, context.keys);

		assert.equal(
			signature,
			"b12442fa9a692ba0a2b76492a584a07a5e715891d58f5c1f11255af47544164b1f6a038a319074e5edc5336bd412eca4b54ebf27f39a76b18a14e92fbcdb2084",
		);
	});

	it("should throw for unsupported versions", (context) => {
		assert.throws(
			() => {
				Signer.sign(Object.assign({}, context.transaction, { version: 110 }), context.keys);
			},
			(err) => err instanceof TransactionVersionError,
		);
	});

	it("should sign version 2 if aip11 milestone is true", (context) => {
		configManager.getMilestone().aip11 = false;

		assert.throws(
			() => {
				Signer.sign(Object.assign({}, context.transaction, { version: 2 }), context.keys);
			},
			(err) => err instanceof TransactionVersionError,
		);

		configManager.getMilestone().aip11 = true;

		assert.not.throws(
			() => {
				Signer.sign(Object.assign({}, context.transaction, { version: 2 }), context.keys);
			},
			(err) => err instanceof TransactionVersionError,
		);
	});
});
