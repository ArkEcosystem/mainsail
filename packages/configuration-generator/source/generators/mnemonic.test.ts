import { Application } from "@mainsail/kernel";
import { ServiceProvider as CryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";
import { MnemonicGenerator } from "./mnemonic";

describe<{
	generator: MnemonicGenerator;
}>("MnemonicGenerator", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		const app = new Application();
		await app.resolve(ValidationServiceProvider).register();
		await app.resolve(CryptoHashBcrypto).register();

		context.generator = app.resolve(MnemonicGenerator);
	});

	it("#generate - should generate mnemonic", ({ generator }) => {
		assert.string(generator.generate());
	});

	it("#generateMany - should generate many mnemonic", ({ generator }) => {
		const mnemonics = generator.generateMany(3);

		assert.array(mnemonics);
		assert.equal(mnemonics.length, 3);
	});

	it("#generateDeterministic - should derive a stable mnemonic from a seed", ({ generator }) => {
		const mnemonic = generator.generateDeterministic("alice");

		assert.string(mnemonic);
		// Deterministic: same seed -> same mnemonic.
		assert.equal(generator.generateDeterministic("alice"), mnemonic);
		// Different seed -> different mnemonic.
		assert.true(generator.generateDeterministic("bob") !== mnemonic);
	});
});
