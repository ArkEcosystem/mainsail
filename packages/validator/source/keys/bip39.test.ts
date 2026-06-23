import type { Contracts } from "@mainsail/contracts";

import { describe } from "@mainsail/test-runner";

import { validatorKeys } from "../../test/fixtures/validator-keys";
import { BIP39 } from "./bip39";

describe<{
	keyPair: Contracts.Crypto.KeyPair;
}>("BIP39", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.keyPair = validatorKeys[0].consensusKeyPair;
	});

	it("#configure - should return itself for chaining", async ({ keyPair }) => {
		const bip39 = new BIP39();

		assert.equal(await bip39.configure(keyPair), bip39);
	});

	it("#publicKey - should expose the configured public key", async ({ keyPair }) => {
		const bip39 = await new BIP39().configure(keyPair);

		assert.equal(bip39.publicKey, keyPair.publicKey);
	});

	it("#getKeyPair - should return the configured key pair unchanged", async ({ keyPair }) => {
		const bip39 = await new BIP39().configure(keyPair);

		assert.equal(await bip39.getKeyPair(), keyPair);
	});
});
