import { describe } from "../../test-framework/source";
import { Signature } from "./signature";
import { secp256k1 } from "bcrypto";

describe("Signature", ({ assert, it }) => {
	it("should sign and verify", async () => {
		assert.true(
			await new Signature().verify(
				Buffer.from(
					await new Signature().sign(
						Buffer.from("64726e3da8", "hex"),
						Buffer.from("814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2", "hex"),
					),
					"hex",
				),
				Buffer.from("64726e3da8", "hex"),
				Buffer.from("03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f", "hex"),
			),
		);
	});

	it("should sign recoverable and return r,s,v", async () => {
		const privateKey = Buffer.from("814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2", "hex");
		const message = Buffer.from("64726e3da8", "hex");

		const [signature, recoverId] = secp256k1.signRecoverable(message, privateKey);

		const r = signature.subarray(0, 32);
		const s = signature.subarray(32, 64);

		const sig = {
			r: r.toString("hex"),
			s: s.toString("hex"),
			v: recoverId + 27,
		};

		assert.equal(sig, {
			r: "66f1c6d9fe13834f6e348aae40426060339ed8cba7d9b2f105c8220be095877c",
			s: "1368fffd8294f1e22086703d33511fc8bb25231d6e9dc64d6449035003184bdd",
			v: 28,
		});

		const signatureBuffer = Buffer.concat([Buffer.from(sig.r, "hex"), Buffer.from(sig.s, "hex")]);
		const publicKey = secp256k1.recover(message, signatureBuffer, sig.v - 27, true);
		assert.equal(
			publicKey,
			Buffer.from("03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f", "hex"),
		);
	});
});
