import { describe } from "../../core-test-framework/source";
import { Signature } from "./signature";

describe("Signature", ({ assert, it }) => {
	it("should sign and verify", async () => {
		assert.true(
			await new Signature().verify(
				Buffer.from(
					await new Signature().sign(
						Buffer.from("64726e3da8", "hex"),
						Buffer.from("170cc8a0103ed299675a0461681d70c07f61614853876dca0a8be0b53f3cd017", "hex"),
					),
					"hex",
				),
				Buffer.from("64726e3da8", "hex"),
				Buffer.from("4a62da810ef0dfe62b720f496af5005433bd96d95864a6693111d8fbfde65937", "hex"),
			),
		);
	});
});
