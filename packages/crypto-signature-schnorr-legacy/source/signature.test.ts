import { describe } from "../../test-framework/source";
import { Signature } from "./signature";

describe("Signature", ({ assert, it }) => {
	it("should sign and verify", async () => {
		assert.true(
			await new Signature().verify(
				Buffer.from(
					await new Signature().sign(
						Buffer.from("hello", "hex"),
						Buffer.from("d8839c2432bfd0a67ef10a804ba991eabba19f154a3d707917681d45822a5712", "hex"),
					),
					"hex",
				),
				Buffer.from("hello", "hex"),
				Buffer.from("034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192", "hex"),
			),
		);
	});
});
