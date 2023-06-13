import { describe } from "../../../test-framework";
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
		const wallet = await generator.generate(
			"endless deposit bright clip school doctor later surround strategy blouse damage drink diesel erase scrap inside over pledge talent blood bus luggage glad whale",
		);

		assert.string(wallet.address);
		assert.equal(
			wallet.passphrase,
			"endless deposit bright clip school doctor later surround strategy blouse damage drink diesel erase scrap inside over pledge talent blood bus luggage glad whale",
		);
		assert.object(wallet.keys);
	});
});
