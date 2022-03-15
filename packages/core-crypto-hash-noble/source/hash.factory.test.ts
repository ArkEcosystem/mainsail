import { describe } from "../../core-test-framework/source";
import { HashFactory } from "./hash.factory";

describe("HashFactory", ({ assert, it }) => {
	it("should create a hash with the RIPEMD160 method", async () => {
		assert.is(
			Buffer.from(await new HashFactory().ripemd160(Buffer.from("Hello World"))).toString("hex"),
			"a830d7beb04eb7549ce990fb7dc962e499a27230",
		);

		assert.is(
			Buffer.from(
				await new HashFactory().ripemd160([Buffer.from("Hello"), Buffer.from(" "), Buffer.from("World")]),
			).toString("hex"),
			"a830d7beb04eb7549ce990fb7dc962e499a27230",
		);
	});

	it("should create a hash with the SHA256 method", async () => {
		assert.is(
			Buffer.from(await new HashFactory().sha256(Buffer.from("Hello World"))).toString("hex"),
			"a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
		);

		assert.is(
			Buffer.from(
				await new HashFactory().sha256([Buffer.from("Hello"), Buffer.from(" "), Buffer.from("World")]),
			).toString("hex"),
			"a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
		);
	});

	it("should create a hash with the HASH256 method", async () => {
		assert.is(
			Buffer.from(await new HashFactory().hash256(Buffer.from("Hello World"))).toString("hex"),
			"42a873ac3abd02122d27e80486c6fa1ef78694e8505fcec9cbcc8a7728ba8949",
		);

		assert.is(
			Buffer.from(
				await new HashFactory().hash256([Buffer.from("Hello"), Buffer.from(" "), Buffer.from("World")]),
			).toString("hex"),
			"42a873ac3abd02122d27e80486c6fa1ef78694e8505fcec9cbcc8a7728ba8949",
		);
	});
});
