import { base58 } from "bstring";
import moize from "fast-memoize";

import { Cache } from "./cache";
import { InvalidBase58ChecksumError } from "./errors";
import { HashAlgorithms } from "./hash-algorithms";

const encodeCheck = (buffer: Buffer): string => {
	const checksum: Buffer = HashAlgorithms.hash256(buffer);

	return base58.encode(Buffer.concat([buffer, checksum], buffer.length + 4));
};

const decodeCheck = (address: string): Buffer => {
	const buffer: Buffer = base58.decode(address);
	const payload: Buffer = buffer.slice(0, -4);
	const checksum: Buffer = HashAlgorithms.hash256(payload);

	if (checksum.readUInt32LE(0) !== buffer.slice(-4).readUInt32LE(0)) {
		throw new InvalidBase58ChecksumError();
	}

	return payload;
};

export const Base58 = {
	encodeCheck: moize(encodeCheck, {
		cache: {
			// @ts-ignore
			create: () => {
				return new Cache<string, string>(10000);
			},
		},
	}),
	decodeCheck: moize(decodeCheck, {
		cache: {
			// @ts-ignore
			create: () => {
				return new Cache<string, Buffer>(10000);
			},
		},
	}),
};
