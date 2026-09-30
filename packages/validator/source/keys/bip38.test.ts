import { Keystore } from "@chainsafe/bls-keystore";
import { describe } from "@mainsail/test-runner";

import { validatorKeys } from "../../test/fixtures/validator-keys";
import { BIP38 } from "./bip38";

describe<{
	keystore: Keystore;
	password: string;
	privateKey: string;
	publicKey: string;
}>("BIP38", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		const { consensusKeyPair } = validatorKeys[0];
		context.privateKey = consensusKeyPair.privateKey;
		context.publicKey = consensusKeyPair.publicKey;
		context.password = "password";
		context.keystore = await Keystore.create(
			context.password,
			Buffer.from(context.privateKey, "hex"),
			Buffer.from(context.publicKey, "hex"),
			"m/12381/3600/0/0/0",
		);
	});

	it("#configure - should return itself for chaining", async ({ keystore, password }) => {
		const bip38 = new BIP38();

		assert.equal(await bip38.configure(keystore, password), bip38);
	});

	it("#publicKey - should expose the keystore public key", async ({ keystore, password, publicKey }) => {
		const bip38 = await new BIP38().configure(keystore, password);

		assert.equal(bip38.publicKey, publicKey);
	});

	it("#getKeyPair - should decrypt to the original (uncompressed) key pair", async ({
		keystore,
		password,
		privateKey,
		publicKey,
	}) => {
		const bip38 = await new BIP38().configure(keystore, password);

		const keyPair = await bip38.getKeyPair();

		assert.equal(keyPair.privateKey, privateKey);
		assert.equal(keyPair.publicKey, publicKey);
		assert.false(keyPair.compressed);
	});

	it("#getKeyPair - should keep yielding the same key pair across repeated rotations", async ({
		keystore,
		password,
		privateKey,
	}) => {
		const bip38 = await new BIP38().configure(keystore, password);

		// Each call re-encrypts the in-memory keystore with a fresh one-time password.
		// Three consecutive successes prove the rotated otp is carried forward correctly;
		// a broken rotation would fail to decrypt on the second call.
		const first = await bip38.getKeyPair();
		const second = await bip38.getKeyPair();
		const third = await bip38.getKeyPair();

		assert.equal(first.privateKey, privateKey);
		assert.equal(second.privateKey, privateKey);
		assert.equal(third.privateKey, privateKey);
	});

	it("#configure - should not consume the original keystore (still decryptable with the original password)", async ({
		keystore,
		password,
		privateKey,
	}) => {
		await new BIP38().configure(keystore, password);

		// The original keystore object is untouched; rotation happens on an internal copy.
		assert.equal(Buffer.from(await keystore.decrypt(password)).toString("hex"), privateKey);
	});
});
