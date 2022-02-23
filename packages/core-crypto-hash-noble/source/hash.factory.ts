import { Container } from "@arkecosystem/core-container";
import { IHashFactory as Contract } from "@arkecosystem/core-crypto-contracts";
import { ripemd160 } from "@noble/hashes/ripemd160";
import { sha256 } from "@noble/hashes/sha256";

@Container.injectable()
export class HashFactory implements Contract {
	public async ripemd160(data: Buffer): Promise<Buffer> {
		return Buffer.from(ripemd160(Array.isArray(data) ? Buffer.concat(data) : data));
	}

	public async sha256(data: Buffer): Promise<Buffer> {
		return Buffer.from(sha256(Array.isArray(data) ? Buffer.concat(data) : data));
	}

	public async hash256(data: Buffer): Promise<Buffer> {
		return Buffer.from(sha256(Buffer.from(sha256(Array.isArray(data) ? Buffer.concat(data) : data))));
	}
}
