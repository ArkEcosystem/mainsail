import { Container } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Application } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import { describe } from "../../core-test-framework";
import { Validator } from "./validator";

describe<{
	app: Application;
	validator: Validator;
	addressFactory: any;
	blockFactory: any;
	keyPairFactory: any;
	hashFactory: any;
}>("Validator", ({ beforeEach, assert, it, stub, match }) => {
	const keyPair = {
		privateKey: "privateKey",
		publicKey: "publicKey",
	};

	beforeEach((context) => {
		context.keyPairFactory = {
			fromMnemonic: () => keyPair,
		};

		context.addressFactory = {
			fromPublicKey: () => "address",
		};

		context.hashFactory = {
			sha256: () => "payload",
		};

		context.blockFactory = {
			make: () => {},
		};

		context.app = new Application(new Container());

		context.app.bind(Identifiers.Cryptography.Identity.AddressFactory).toConstantValue(context.addressFactory);
		context.app.bind(Identifiers.Cryptography.Block.Factory).toConstantValue(context.blockFactory);
		context.app.bind(Identifiers.Cryptography.Identity.KeyPairFactory).toConstantValue(context.keyPairFactory);
		context.app.bind(Identifiers.Cryptography.HashFactory).toConstantValue(context.hashFactory);

		context.validator = context.app.resolve(Validator);
	});

	it("should configure and return validator", async ({ validator }) => {
		assert.instance(await validator.configure("passphrase"), Validator);

		assert.equal(validator.address, "address");
		assert.equal(validator.publicKey, keyPair.publicKey);
		assert.equal(validator.keys, keyPair);
	});

	it.skip("should forge a block", async ({ validator, blockFactory }) => {
		const spyMake = stub(blockFactory, "make");

		const transactions: Partial<Contracts.Crypto.ITransactionData>[] = [
			{
				amount: BigNumber.ONE,
				fee: BigNumber.ONE,
				id: "123",
			},
		];

		const options = {
			previousBlock: {
				height: 1,
				id: "id",
			},
			reward: BigNumber.ZERO,
			timestamp: 0,
		};

		await validator.configure("passphrase");
		await validator.forge(transactions as Contracts.Crypto.ITransactionData[], options);

		spyMake.calledOnce();
		spyMake.calledWith(
			match({
				generatorPublicKey: keyPair.publicKey,
				height: 2,
				numberOfTransactions: 1,
				payloadHash: "payload",
				payloadLength: 32,
				previousBlock: "id",
				reward: options.reward,
				timestamp: options.timestamp,
				totalAmount: BigNumber.ONE,
				totalFee: BigNumber.ONE,
				transactions: transactions,
				version: 1,
			}),
			keyPair,
		);
	});
});
