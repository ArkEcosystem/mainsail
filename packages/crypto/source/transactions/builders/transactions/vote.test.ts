import { describe, Factories, Generators } from "@arkecosystem/core-test-framework";
import { BigNumber } from "../../../utils/bignum";
import { TransactionType } from "../../../enums";
import { Keys } from "../../../identities";
import { configManager } from "../../../managers";
import { BuilderFactory } from "../../index";
import { Two } from "../../types";
import { VoteBuilder } from "./vote";
import { NetworkConfig } from "../../../interfaces";

describe<{
	config: NetworkConfig;
	identity: any;
	builder: VoteBuilder;
}>("Vote Transaction", ({ it, assert, stub, beforeAll, beforeEach, afterAll }) => {
	beforeAll((context) => {
		context.config = configManager.all();

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		const config = Generators.generateCryptoConfigRaw();
		configManager.setConfig(config);

		context.identity = Factories.factory("Identity")
			.withOptions({ passphrase: "this is a top secret passphrase", network: config.network })
			.make();
	});

	beforeEach((context) => {
		context.builder = BuilderFactory.vote();
	});

	afterAll((context) => {
		configManager.setConfig(context.config);
	});

	it("verify - should be valid with a signature", (context) => {
		const actual = context.builder
			.votesAsset(["+02d0d835266297f15c192be2636eb3fbc30b39b87fc583ff112062ef8ae1a1f2af"])
			.sign("dummy passphrase");

		assert.true(actual.build().verified);
		assert.true(actual.verify());
	});

	it("verify - should be valid with a second signature", (context) => {
		const actual = context.builder
			.votesAsset(["+02d0d835266297f15c192be2636eb3fbc30b39b87fc583ff112062ef8ae1a1f2af"])
			.sign("dummy passphrase");

		assert.true(actual.build().verified);
		assert.true(actual.verify());
	});

	it("should have its specific properties", (context) => {
		assert.equal(context.builder.data.type, TransactionType.Vote);
		assert.equal(context.builder.data.fee, Two.VoteTransaction.staticFee());
		assert.equal(context.builder.data.amount, BigNumber.make(0));
		assert.equal(context.builder.data.recipientId, undefined);
		assert.equal(context.builder.data.senderPublicKey, undefined);
		assert.defined(context.builder.data.asset);
		assert.equal(context.builder.data.asset.votes, []);
	});

	it("votesAsset - establishes the votes asset", (context) => {
		const votes = ["+dummy-1"];
		context.builder.votesAsset(votes);
		assert.equal(context.builder.data.asset.votes, votes);
	});

	it("sign - establishes the recipient id", (context) => {
		stub(Keys, "fromPassphrase").returnValueOnce(context.identity.keys);

		context.builder.sign(context.identity.bip39);

		assert.equal(context.builder.data.recipientId, context.identity.address);
	});

	it("signWithWif - establishes the recipient id", (context) => {
		stub(Keys, "fromWIF").returnValueOnce(context.identity.keys);

		context.builder.signWithWif(context.identity.wif);
		assert.equal(context.builder.data.recipientId, context.identity.address);
	});
});
