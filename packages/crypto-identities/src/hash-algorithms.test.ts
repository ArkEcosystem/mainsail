import "jest-extended";

import { HashAlgorithms } from "./hash-algorithms";

const buffer = Buffer.from("Hello World");

describe("HashAlgorithms", () => {
	it("should return valid ripemd160", () => {
		expect(HashAlgorithms.ripemd160(buffer).toString("hex")).toEqual("a830d7beb04eb7549ce990fb7dc962e499a27230");
	});

	it("should return valid sha1", () => {
		expect(HashAlgorithms.sha1(buffer).toString("hex")).toEqual("0a4d55a8d778e5022fab701977c5d840bbc486d0");
	});

	it("should return valid sha256", () => {
		expect(HashAlgorithms.sha256(buffer).toString("hex")).toEqual(
			"a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
		);
		expect(HashAlgorithms.sha256("Hello World").toString("hex")).toEqual(
			"a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
		);
		expect(HashAlgorithms.sha256([buffer, buffer]).toString("hex")).toEqual(
			"60b3aaa7a9c94c59ff828b651205b1c5409eaf492505cd4a0a45133013b5a028",
		);
	});

	it("should return valid hash160", () => {
		expect(HashAlgorithms.hash160(buffer).toString("hex")).toEqual("bdfb69557966d026975bebe914692bf08490d8ca");
	});

	it("should return valid hash256", () => {
		expect(HashAlgorithms.hash256(buffer).toString("hex")).toEqual(
			"42a873ac3abd02122d27e80486c6fa1ef78694e8505fcec9cbcc8a7728ba8949",
		);
	});
});
