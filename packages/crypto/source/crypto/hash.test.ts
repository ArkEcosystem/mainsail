import { describe, Factories, Generators, TransactionFactory } from "@arkecosystem/core-test-framework";
import { BigNumber } from "../utils/bignum";
import { Hash } from "./hash";
import { configManager } from "../managers";
import { Utils } from "../transactions/utils";
import { ITransactionData, NetworkConfig } from "../interfaces";

describe<{
	config: NetworkConfig;
	identity: any;
	transaction: ITransactionData;
}>("Hash", ({ it, assert, beforeAll, afterAll }) => {
	beforeAll((context) => {
		context.config = configManager.all();

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		const config = Generators.generateCryptoConfigRaw();
		configManager.setConfig(config);

		context.identity = Factories.factory("Identity")
			.withOptions({ passphrase: "this is a top secret passphrase" })
			.make();

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

	it("ECDSA - should sign the data and verify it [String]", (context) => {
		const hash: Buffer = Utils.toHash(context.transaction);
		const signature: string = Hash.signECDSA(hash, context.identity.keys);

		assert.true(Hash.verifyECDSA(hash, signature, context.identity.publicKey));

		assert.equal(
			signature,
			"30450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
		);
	});

	it("ECDSA - should sign the data and verify it [Buffer]", (context) => {
		const hash: Buffer = Utils.toHash(context.transaction);
		const signature: string = Hash.signECDSA(hash, context.identity.keys);

		assert.true(
			Hash.verifyECDSA(hash, Buffer.from(signature, "hex"), Buffer.from(context.identity.publicKey, "hex")),
		);

		assert.equal(
			signature,
			"30450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
		);
	});

	it("ECDSA - should not verify when signature length does not match R and S length", (context) => {
		const hash: Buffer = Utils.toHash(context.transaction);
		const validSignature =
			"30450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444";
		const invalidSignature =
			"30460221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a8357744400";

		assert.true(Hash.verifyECDSA(hash, validSignature, Buffer.from(context.identity.publicKey, "hex")));
		assert.false(Hash.verifyECDSA(hash, invalidSignature, Buffer.from(context.identity.publicKey, "hex")));
	});

	it("ECDSA - should not verify when signature R or S is negative", (context) => {
		const hash: Buffer = Utils.toHash(context.transaction);
		const validSignature =
			"30450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444";
		const invalidSignatureNegativeR =
			"304402208682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444";

		assert.true(Hash.verifyECDSA(hash, validSignature, Buffer.from(context.identity.publicKey, "hex")));
		assert.false(Hash.verifyECDSA(hash, invalidSignatureNegativeR, Buffer.from(context.identity.publicKey, "hex")));
	});

	it("ECDSA - should not verify when signature R or S has incorrect padding zeros", (context) => {
		const transactionHash: Buffer = Utils.toHash(context.transaction);
		const validSignature =
			"30450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444";
		const invalidSignatures = [
			"3046022200008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
			"30460221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b4702210023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
			"304702230000008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
			"30460221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b470222000023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
		];

		assert.true(Hash.verifyECDSA(transactionHash, validSignature, Buffer.from(context.identity.publicKey, "hex")));

		for (const invalidSignature of invalidSignatures) {
			assert.false(
				Hash.verifyECDSA(transactionHash, invalidSignature, Buffer.from(context.identity.publicKey, "hex")),
			);
		}

		// also check specific case where s length is 31 bytes (because s is low enough to not need 32 bytes)
		const data = {
			id: "e215334a97c13d80156bed8f889ed27970203bef9d932afff6cdc9fe2a62530d",
			version: 2,
			type: 0,
			typeGroup: 1,
			amount: BigNumber.make("10000000"),
			fee: BigNumber.make("10000000"),
			senderPublicKey: "025153dba3247208ed8f5e2616cd956401bed2906d6f94fb44d87ab5d05e06d4e3",
			recipientId: "Aa8NVJUW6tnbdoYYRmwYgV5TdFXhDvAJXA",
			timestamp: 93745400,
			nonce: BigNumber.make("53"),
			network: 23,
		};
		const signature =
			"304402202377db2bc936f600516aca95aed631d2ab6971be1be4d449989d9ed7457356e20220002dbdea52266d03839468eaad90ad9ca13e823d35e29291842e49f4555c33c1";
		const signatureNotPadded =
			"304302202377db2bc936f600516aca95aed631d2ab6971be1be4d449989d9ed7457356e2021f2dbdea52266d03839468eaad90ad9ca13e823d35e29291842e49f4555c33c1";
		const hash: Buffer = Utils.toHash(data);

		assert.true(Hash.verifyECDSA(hash, signatureNotPadded, Buffer.from(data.senderPublicKey, "hex")));
		assert.false(Hash.verifyECDSA(hash, signature, Buffer.from(data.senderPublicKey, "hex")));
	});

	it("ECDSA - should not verify with a wrong signature length value", (context) => {
		const hash: Buffer = Utils.toHash(context.transaction);
		const validSignature =
			"30450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444";
		const invalidSignatures = [
			"30440221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
			"30430221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
			"30460221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
		];

		assert.true(Hash.verifyECDSA(hash, validSignature, Buffer.from(context.identity.publicKey, "hex")));

		for (const invalidSignature of invalidSignatures) {
			assert.false(Hash.verifyECDSA(hash, invalidSignature, Buffer.from(context.identity.publicKey, "hex")));
		}
	});

	it("ECDSA - should not verify with a wrong header byte", (context) => {
		const hash: Buffer = Utils.toHash(context.transaction);
		const validSignature =
			"30450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444";
		const invalidSignatures = [
			"20450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
			"31450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
			"40450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
		];

		assert.true(Hash.verifyECDSA(hash, validSignature, Buffer.from(context.identity.publicKey, "hex")));

		for (const invalidSignature of invalidSignatures) {
			assert.throws(() =>
				Hash.verifyECDSA(hash, invalidSignature, Buffer.from(context.identity.publicKey, "hex")),
			);
		}
	});

	it("ECDSA - should not verify with a wrong integer marker", (context) => {
		const hash: Buffer = Utils.toHash(context.transaction);
		const validSignature =
			"30450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444";
		const invalidSignatures = [
			"30450121008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
			"30450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47012023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
			"30450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47032023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
		];

		assert.true(Hash.verifyECDSA(hash, validSignature, Buffer.from(context.identity.publicKey, "hex")));

		for (const invalidSignature of invalidSignatures) {
			assert.throws(() =>
				Hash.verifyECDSA(hash, invalidSignature, Buffer.from(context.identity.publicKey, "hex")),
			);
		}
	});

	it("ECDSA - should not verify with a wrong R or S length", (context) => {
		const hash: Buffer = Utils.toHash(context.transaction);
		const validSignature =
			"30450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444";
		const invalidSignatures = [
			"30450220008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
			"30450221008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022123cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
			"30450222008682af02d5f3c6302af14f3239a997022f69c28a5e3282603d5f25912ccd3b47022023cec266362f5bb91e6a2f2fcb62f4c61829dfd7a096432ff8b4a54a83577444",
		];

		assert.true(Hash.verifyECDSA(hash, validSignature, Buffer.from(context.identity.publicKey, "hex")));

		for (const invalidSignature of invalidSignatures) {
			assert.throws(() =>
				Hash.verifyECDSA(hash, invalidSignature, Buffer.from(context.identity.publicKey, "hex")),
			);
		}
	});

	it("schnorr - should sign the data and verify it [String]", (context) => {
		const hash: Buffer = Utils.toHash(context.transaction);
		const signature: string = Hash.signSchnorr(hash, context.identity.keys);

		assert.true(Hash.verifySchnorr(hash, signature, context.identity.publicKey));

		assert.equal(
			signature,
			"dd78ce399058357fc3ca881d38e54efc1b6841719106aa55fb186186fa0f3330bc37c8cb2bd8e48d272f1f9532df89a6b5f69945c56d05947bd3186e872db99a",
		);
	});

	it("schnorr - should sign the data and verify it [Buffer]", (context) => {
		const hash: Buffer = Utils.toHash(context.transaction);
		const signature: string = Hash.signSchnorr(hash, context.identity.keys);

		assert.true(
			Hash.verifySchnorr(hash, Buffer.from(signature, "hex"), Buffer.from(context.identity.publicKey, "hex")),
		);

		assert.equal(
			signature,
			"dd78ce399058357fc3ca881d38e54efc1b6841719106aa55fb186186fa0f3330bc37c8cb2bd8e48d272f1f9532df89a6b5f69945c56d05947bd3186e872db99a",
		);
	});
});
