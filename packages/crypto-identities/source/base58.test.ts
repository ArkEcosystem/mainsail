import "jest-extended";

import { Base58 } from "./base58";
import { InvalidBase58ChecksumError } from "./errors";
import { HashAlgorithms } from "./hash-algorithms";

const createPayload = () => {
	const buffer: Buffer = HashAlgorithms.ripemd160(
		Buffer.from("034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192", "hex"),
	);
	const payload: Buffer = Buffer.alloc(21);

	payload.writeUInt8(30, 0);
	buffer.copy(payload, 1);

	return payload;
};

describe("Base58", () => {
	it("encodeCheck", () => {
		expect(Base58.encodeCheck(createPayload())).toBe("D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib");
		// Check cached
		expect(Base58.encodeCheck(createPayload())).toBe("D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib");
	});

	it("decodeCheck", () => {
		expect(Base58.decodeCheck("D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib")).toEqual(createPayload());
		expect(() => Base58.decodeCheck("A61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib")).toThrow(InvalidBase58ChecksumError);
	});
});
