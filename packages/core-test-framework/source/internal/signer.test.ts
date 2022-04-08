import cryptoConfig from "../../../core/bin/config/testnet/crypto.json";
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

		assert.defined(entity.signature);
		assert.defined(entity.vendorField);
	});

	it("should make validator", async ({ signer }) => {
		const options: Types.ValidatorRegistrationOptions = {
			fee: "5",
			passphrase: passphrases[0],
			username: "dummy",
		};

		const entity = await signer.makeValidator(options);

		assert.defined(entity.signature);
		assert.equal(entity.asset?.validator?.username, "dummy");
	});

	it("should make vote", async ({ signer }) => {
		const options: Types.VoteOptions = {
			fee: "5",
			passphrase: passphrases[0],
		};

		const entity = await signer.makeVote(options);

		assert.defined(entity.signature);
		assert.array(entity.asset?.votes);
	});

	it("should make multi signature registration", async ({ signer }) => {
		const options: Types.MultiSignatureOptions = {
			min: 2,
			passphrase: passphrases[0],
			passphrases: [passphrases[0], passphrases[1], passphrases[2]],
		};

		const entity = await signer.makeMultiSignatureRegistration(options);

		assert.defined(entity.signature);
		assert.array(entity.signatures);
		assert.equal(entity.asset?.multiSignature?.min, 2);
		assert.array(entity.asset?.multiSignature?.publicKeys);
	});

	it("should make multi payment", async ({ signer }) => {
		const options: Types.MultiPaymentOptions = {
			fee: "5",
			passphrase: passphrases[0],
		};

		const entity = await signer.makeMultipayment(options);

		assert.defined(entity.signature);
		assert.array(entity.asset?.payments);
	});
});
