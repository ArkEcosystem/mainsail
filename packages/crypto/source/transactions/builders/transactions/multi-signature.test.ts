import { describe, Generators } from "@arkecosystem/core-test-framework";
import { TransactionType } from "../../../enums";
import { TransactionVersionError } from "../../../errors";
import { configManager } from "../../../managers";
import { BuilderFactory } from "../../index";
import { MultiSignatureBuilder } from "../../builders/transactions/multi-signature";
import { Two } from "../../types";
import { BigNumber } from "../../../utils/bignum";
import { IMultiSignatureAsset, NetworkConfig } from "../../../interfaces";

describe<{
	config: NetworkConfig;
	builder: MultiSignatureBuilder;
	multiSignatureFee: BigNumber;
	multiSignature: IMultiSignatureAsset;
}>("Multi Signature Transaction", ({ it, assert, beforeAll, beforeEach, afterAll }) => {
	beforeAll((context) => {
		context.config = configManager.all();

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		const config = Generators.generateCryptoConfigRaw();
		configManager.setConfig(config);

		context.multiSignatureFee = Two.MultiSignatureRegistrationTransaction.staticFee();
		context.multiSignature = {
			publicKeys: ["key a", "key b", "key c"],
			min: 1,
		};
	});

	beforeEach((context) => {
		context.builder = BuilderFactory.multiSignature();
	});

	afterAll((context) => {
		configManager.setConfig(context.config);
	});

	it("verify - should be valid with a signature", (context) => {
		const actual = context.builder
			.multiSignatureAsset({
				publicKeys: [
					"039180ea4a8a803ee11ecb462bb8f9613fcdb5fe917e292dbcc73409f0e98f8f22",
					"028d3611c4f32feca3e6713992ae9387e18a0e01954046511878fe078703324dc0",
					"021d3932ab673230486d0f956d05b9e88791ee298d9af2d6df7d9ed5bb861c92dd",
				],
				min: 2,
			})
			.senderPublicKey("039180ea4a8a803ee11ecb462bb8f9613fcdb5fe917e292dbcc73409f0e98f8f22")
			.multiSign("secret 1", 0)
			.multiSign("secret 2", 1)
			.multiSign("secret 3", 2)
			.sign("secret 1");

		assert.true(actual.build().verified);
		assert.true(actual.verify());
	});

	it("verify - should be invalid when aip11 is not active", (context) => {
		configManager.getMilestone().aip11 = false;
		const actual = context.builder
			.multiSignatureAsset({
				publicKeys: [
					"039180ea4a8a803ee11ecb462bb8f9613fcdb5fe917e292dbcc73409f0e98f8f22",
					"028d3611c4f32feca3e6713992ae9387e18a0e01954046511878fe078703324dc0",
					"021d3932ab673230486d0f956d05b9e88791ee298d9af2d6df7d9ed5bb861c92dd",
				],
				min: 2,
			})
			.senderPublicKey("039180ea4a8a803ee11ecb462bb8f9613fcdb5fe917e292dbcc73409f0e98f8f22");

		assert.throws(
			() => actual.multiSign("secret 1", 0),
			(err) => err instanceof TransactionVersionError,
		);
		configManager.getMilestone().aip11 = true;
	});

	it("should have its specific properties", (context) => {
		assert.equal(context.builder.data.type, TransactionType.MultiSignature);
		assert.equal(context.builder.data.version, 0x02);
		assert.equal(context.builder.data.fee, BigNumber.make(0));
		assert.equal(context.builder.data.amount, BigNumber.make(0));
		assert.equal(context.builder.data.recipientId, undefined);
		assert.equal(context.builder.data.senderPublicKey, undefined);
		assert.defined(context.builder.data.asset);
		assert.equal(context.builder.data.asset.multiSignature, { min: 0, publicKeys: [] });
	});

	it("multiSignatureAsset - establishes the multi-signature on the asset", (context) => {
		context.builder.multiSignatureAsset(context.multiSignature);

		assert.equal(context.builder.data.asset.multiSignature, context.multiSignature);
	});

	it("multiSignatureAsset - calculates and establish the fee", (context) => {
		context.builder.multiSignatureAsset(context.multiSignature);

		assert.equal(context.builder.data.fee, BigNumber.make(4).times(context.multiSignatureFee));
	});

	it("multiSign - adds the signature to the transaction", (context) => {
		const actual = context.builder
			.multiSignatureAsset({
				publicKeys: [
					"039180ea4a8a803ee11ecb462bb8f9613fcdb5fe917e292dbcc73409f0e98f8f22",
					"028d3611c4f32feca3e6713992ae9387e18a0e01954046511878fe078703324dc0",
					"021d3932ab673230486d0f956d05b9e88791ee298d9af2d6df7d9ed5bb861c92dd",
				],
				min: 2,
			})
			.senderPublicKey("039180ea4a8a803ee11ecb462bb8f9613fcdb5fe917e292dbcc73409f0e98f8f22")
			.nonce("1");

		actual.multiSign("secret 1", 0).multiSign("secret 2", 1).multiSign("secret 3", 2);

		assert.equal(actual.data.signatures, [
			"009fe6ca3b83a9a5e693fecb2b184900c5135a8c07e704c473b2f19117630f840428416f583f1a24ff371ba7e6fbca9a7fb796226ef9ef6542f44ed911951ac88d",
			"0116779a98b2009b35d4003dda7628e46365f1a52068489bfbd80594770967a3949f76bc09e204eddd7d460e1e519b826c53dc6e2c9573096326dbc495050cf292",
			"02687bd0f4a91be39daf648a5b1e1af5ffa4a3d4319b2e38b1fc2dc206db03f542f3b26c4803e0b4c8a53ddfb6cf4533b512d71ae869d4e4ccba989c4a4222396b",
		]);
		assert.length(actual.data.signatures, 3);
	});
});
