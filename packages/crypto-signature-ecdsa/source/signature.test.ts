import { describe } from "@mainsail/test-runner";
import { Signature } from "./signature";
import { secp256k1 } from "bcrypto";

describe("Signature", ({ assert, it }) => {
	it("should sign recoverable and return r,s,v", async () => {
		const privateKey = Buffer.from("814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2", "hex");
		const publicKey = secp256k1.publicKeyCreate(privateKey, true).toString("hex");
		assert.equal(publicKey, "03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f");

		const message = Buffer.from("64726e3da8", "hex");

		const signature = await new Signature().signRecoverable(message, privateKey);

		assert.equal(signature, {
			r: "66f1c6d9fe13834f6e348aae40426060339ed8cba7d9b2f105c8220be095877c",
			s: "1368fffd8294f1e22086703d33511fc8bb25231d6e9dc64d6449035003184bdd",
			v: 1,
		});

		const recoveredPublicKey = new Signature().recoverPublicKey(message, signature);
		assert.equal(recoveredPublicKey, publicKey);
		assert.true(await new Signature().verifyRecoverable(signature, message, Buffer.from(publicKey, "hex")));
	});

	it("#verifyRecoverable should return false if s is not low", async () => {
		const signature = {
			r: "66f1c6d9fe13834f6e348aae40426060339ed8cba7d9b2f105c8220be095877c",
			s: "fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141bd",
			v: 1,
		};

		const message = Buffer.from("64726e3da8", "hex");
		const publicKey = Buffer.from("03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f", "hex");

		assert.false(await new Signature().verifyRecoverable(signature, message, publicKey));
	});

	it("#verifyRecoverable should return false for the high s form of a signature", async () => {
		const signature = {
			r: "66f1c6d9fe13834f6e348aae40426060339ed8cba7d9b2f105c8220be095877c",
			s: "1368fffd8294f1e22086703d33511fc8bb25231d6e9dc64d6449035003184bdd",
			v: 1,
		};

		const message = Buffer.from("64726e3da8", "hex");
		const publicKey = Buffer.from("03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f", "hex");

		assert.true(await new Signature().verifyRecoverable(signature, message, publicKey));
		assert.false(
			await new Signature().verifyRecoverable(
				{ ...signature, s: "ec9700027d6b0e1ddf798fc2ccaee035ff89b9c940aad9ee5b895b3ccd1df564", v: 0 },
				message,
				publicKey,
			),
		);
	});

	it("#verifyRecoverable should return false if v is not the recovery id", async () => {
		const signature = {
			r: "66f1c6d9fe13834f6e348aae40426060339ed8cba7d9b2f105c8220be095877c",
			s: "1368fffd8294f1e22086703d33511fc8bb25231d6e9dc64d6449035003184bdd",
			v: 1,
		};

		const message = Buffer.from("64726e3da8", "hex");
		const publicKey = Buffer.from("03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f", "hex");

		assert.true(await new Signature().verifyRecoverable(signature, message, publicKey));

		for (const v of [0, 2, 3, 27]) {
			assert.false(await new Signature().verifyRecoverable({ ...signature, v }, message, publicKey));
		}
	});

	it("#verifyRecoverable should return false if no public key is recovered", async () => {
		const signature = {
			r: "66f1c6d9fe13834f6e348aae40426060339ed8cba7d9b2f105c8220be095877c",
			s: "1368fffd8294f1e22086703d33511fc8bb25231d6e9dc64d6449035003184bdd",
			v: 1,
		};

		const message = Buffer.from("64726e3da8", "hex");
		const publicKey = Buffer.from("03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f", "hex");

		assert.true(await new Signature().verifyRecoverable(signature, message, publicKey));
		assert.false(await new Signature().verifyRecoverable({ ...signature, r: "00".repeat(32) }, message, publicKey));
	});

	it("#verifyRecoverable should verify an uncompressed public key", async () => {
		const signature = {
			r: "66f1c6d9fe13834f6e348aae40426060339ed8cba7d9b2f105c8220be095877c",
			s: "1368fffd8294f1e22086703d33511fc8bb25231d6e9dc64d6449035003184bdd",
			v: 1,
		};

		const message = Buffer.from("64726e3da8", "hex");
		const publicKey = Buffer.from(
			"04e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f9e02d3df88d4bb625c9a207438037f2ab6a820c143db43baa552bb980dbd8095",
			"hex",
		);

		assert.true(await new Signature().verifyRecoverable(signature, message, publicKey));
	});
});
