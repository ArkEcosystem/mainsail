import cryptoConfig from "../../../core/bin/config/devnet/core/crypto.json";
import { Types } from "../factories";
import { describe } from "@mainsail/test-runner";
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
			gasPrice: 5 * 1e9,
			passphrase: passphrases[0],
		};

		const entity = await signer.makeTransfer(options);

		assert.defined(entity.data.v);
		assert.defined(entity.data.r);
		assert.defined(entity.data.s);
	});

	it("should make evm call", async ({ signer }) => {
		const options: Types.EvmCallOptions = {
			evmCall: {
				gasLimit: 21_000,
				payload:
					"a9059cbb000000000000000000000000bd6f65c58a46427af4b257cbe231d0ed69ed550800000000000000000000000000000000000000000000003635c9adc5dea00000",
			},
			gasPrice: 5 * 1e9,
			passphrase:
				"violin hello resist adult roof breeze blood old tell source enforce token void wagon sweet detail raw coast viable garden cause gasp soap fat",
			recipientAddress: "0xD3D80a3Df661414a76aAd7738a136A8d7aAa1666",
		};

		const entity = await signer.makeEvmCall(options);

		assert.defined(entity.data.v);
		assert.defined(entity.data.r);
		assert.defined(entity.data.s);
		assert.equal(entity.data.to, "0xD3D80a3Df661414a76aAd7738a136A8d7aAa1666");
		assert.equal(entity.data.gasLimit, 21_000);
		assert.equal(
			entity.data.data,
			"a9059cbb000000000000000000000000bd6f65c58a46427af4b257cbe231d0ed69ed550800000000000000000000000000000000000000000000003635c9adc5dea00000",
		);
	});
});
