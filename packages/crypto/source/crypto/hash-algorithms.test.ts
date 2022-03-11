import { describe } from "@arkecosystem/core-test-framework";
import { HashAlgorithms } from "./hash-algorithms";
import fixtures from "../../test/fixtures/crypto.json";

const buffer = Buffer.from("Hello World");

describe("Crypto - Utils", ({ it, assert }) => {
	it("should return valid ripemd160", () => {
		assert.equal(HashAlgorithms.ripemd160(buffer).toString("hex"), fixtures.ripemd160);
	});

	it("should return valid sha256", () => {
		assert.equal(HashAlgorithms.sha256(buffer).toString("hex"), fixtures.sha256);
	});

	it("should return valid hash160", () => {
		assert.equal(HashAlgorithms.hash160(buffer).toString("hex"), fixtures.hash160);
	});

	it("should return valid hash256", () => {
		assert.equal(HashAlgorithms.hash256(buffer).toString("hex"), fixtures.hash256);
	});
});
