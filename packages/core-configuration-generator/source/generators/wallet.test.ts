import { describe } from "../../../core-test-framework/distribution";
import { makeApplication } from "../application-factory";
import { Identifiers } from "../identifiers";
import { WalletGenerator } from "./wallet";

describe<{
	generator: WalletGenerator;
}>("WalletGenerator", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		const app = await makeApplication();

		context.generator = app.get<WalletGenerator>(Identifiers.Generator.Wallet);
	});

	it("#generate - should return wallet", async ({ generator }) => {
		const wallet = await generator.generate();

		assert.string(wallet.address);
		assert.string(wallet.passphrase);
		assert.object(wallet.keys);
	});

	it("#generate - should return wallet from mnemonic", async ({ generator }) => {
		const wallet = await generator.generate("mnemonic");

		assert.string(wallet.address);
		assert.equal(wallet.passphrase, "mnemonic");
		assert.object(wallet.keys);
	});
});
