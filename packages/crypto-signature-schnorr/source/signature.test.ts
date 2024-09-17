import { describe } from "../../test-framework/source";
import { Signature } from "./signature";

describe("Signature", ({ assert, it }) => {
	it("should sign and verify", async () => {
		assert.true(
			await new Signature().verify(
				Buffer.from(
					await new Signature().sign(
						Buffer.from("814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2", "hex"),
						Buffer.from("814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2", "hex"),
					),
					"hex",
				),
				Buffer.from("814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2", "hex"),
				Buffer.from("e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f", "hex"),
			),
		);
	});

	it("should sign and verify with ECDSA key (prefix)", async () => {
		assert.true(
			await new Signature().verify(
				Buffer.from(
					await new Signature().sign(
						Buffer.from("6616cd071ecbfe525be817d29eb1ccd6d93af0a9207356b38dcd73fcc84ff297", "hex"),
						Buffer.from("6acdb0def03305800b75e9c020e0a9b0504a543f56253f694ff35f1dce8a193f", "hex"),
					),
					"hex",
				),
				Buffer.from("6616cd071ecbfe525be817d29eb1ccd6d93af0a9207356b38dcd73fcc84ff297", "hex"),
				Buffer.from("025f7362e1baff21b8441c20b3f54583eb2f5925afada140b5a95880a2224a9d48", "hex"),
			),
		);
	});

	it("should sign and verify with ECDSA key (no prefix)", async () => {
		assert.true(
			await new Signature().verify(
				Buffer.from(
					await new Signature().sign(
						Buffer.from("6616cd071ecbfe525be817d29eb1ccd6d93af0a9207356b38dcd73fcc84ff297", "hex"),
						Buffer.from("6acdb0def03305800b75e9c020e0a9b0504a543f56253f694ff35f1dce8a193f", "hex"),
					),
					"hex",
				),
				Buffer.from("6616cd071ecbfe525be817d29eb1ccd6d93af0a9207356b38dcd73fcc84ff297", "hex"),
				Buffer.from("5f7362e1baff21b8441c20b3f54583eb2f5925afada140b5a95880a2224a9d48", "hex"),
			),
		);
	});

	it("should not sign and verify with wrong ECDSA key", async () => {
		assert.false(
			await new Signature().verify(
				Buffer.from(
					await new Signature().sign(
						Buffer.from("6616cd071ecbfe525be817d29eb1ccd6d93af0a9207356b38dcd73fcc84ff297", "hex"),
						Buffer.from("6acdb0def03305800b75e9c020e0a9b0504a543f56253f694ff35f1dce8a193f", "hex"),
					),
					"hex",
				),
				Buffer.from("6616cd071ecbfe525be817d29eb1ccd6d93af0a9207356b38dcd73fcc84ff297", "hex"),
				Buffer.from("02d076ae01c84ad5e72eb2aae9a3c60784b08cc1f0e8624fe3cc51648a163ee120", "hex"),
			),
		);
	});
});
