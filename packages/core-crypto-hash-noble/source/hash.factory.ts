import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { ripemd160 } from "@noble/hashes/ripemd160";
import { sha256 } from "@noble/hashes/sha256";

@injectable()
export class HashFactory implements Contracts.Crypto.IHashFactory {
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
