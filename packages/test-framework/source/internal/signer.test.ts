import cryptoConfig from "../../../core/bin/config/testnet/core/crypto.json";
import { Types } from "../factories";
import { describe } from "../index";
import passphrases from "./passphrases.json";
import { Signer } from "./signer";

describe<{
	signer: Signer;
}>("Signer", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.signer = new Signer(cryptoConfig, "1");
	});

	it("should make transfer", async ({ signer }) => {
		const options: Types.TransferOptions = {
			amount: "100",
			fee: "5",
			passphrase: passphrases[0],
			vendorField: "dummy",
		};

		const entity = await signer.makeTransfer(options);

		assert.defined(entity.data.signature);
		assert.defined(entity.data.vendorField);
	});

	it("should make validator", async ({ signer }) => {
		const options: Types.ValidatorRegistrationOptions = {
			fee: "5",
			passphrase: passphrases[0],
			publicKey: "a".repeat(96),
		};

		const entity = await signer.makeValidator(options);

		assert.defined(entity.data.signature);
		assert.defined(entity.data.asset?.validatorPublicKey);
	});

	it("should make vote", async ({ signer }) => {
		const options: Types.VoteOptions = {
			fee: "5",
			passphrase: passphrases[0],
		};

		const entity = await signer.makeVote(options);

		assert.defined(entity.data.signature);
		assert.array(entity.data.asset?.votes);
	});

	it.skip("should make multi signature registration", async ({ signer }) => {
		// TODO fails with:
		// data must have required property 'signatures'
		// data/version must be equal to one of the allowed values
		const options: Types.MultiSignatureOptions = {
			min: 2,
			passphrase: passphrases[0],
			passphrases: [passphrases[0], passphrases[1], passphrases[2]],
		};

		const entity = await signer.makeMultiSignatureRegistration(options);

		assert.defined(entity.data.signature);
		assert.array(entity.data.signatures);
		assert.equal(entity.data.asset?.multiSignature?.min, 2);
		assert.array(entity.data.asset?.multiSignature?.publicKeys);
	});

	it("should make multi payment", async ({ signer }) => {
		const options: Types.MultiPaymentOptions = {
			fee: "5",
			passphrase: passphrases[0],
		};

		const entity = await signer.makeMultipayment(options);

		assert.defined(entity.data.signature);
		assert.array(entity.data.asset?.payments);
	});

	it("should make evm call", async ({ signer }) => {
		const options: Types.EvmCallOptions = {
			evmCall: {
				gasLimit: 21_000,
				payload:
					"a9059cbb000000000000000000000000bd6f65c58a46427af4b257cbe231d0ed69ed550800000000000000000000000000000000000000000000003635c9adc5dea00000",
			},
			fee: "2500000000",
			passphrase:
				"violin hello resist adult roof breeze blood old tell source enforce token void wagon sweet detail raw coast viable garden cause gasp soap fat",
			recipientId: "0xD3D80a3Df661414a76aAd7738a136A8d7aAa1666",
		};

		const entity = await signer.makeEvmCall(options);

		assert.defined(entity.data.signature);
		assert.equal(entity.data.recipientId, "0xD3D80a3Df661414a76aAd7738a136A8d7aAa1666");
		assert.equal(entity.data.asset?.evmCall, {
			gasLimit: 21_000,
			payload:
				"a9059cbb000000000000000000000000bd6f65c58a46427af4b257cbe231d0ed69ed550800000000000000000000000000000000000000000000003635c9adc5dea00000",
		});
	});
});
