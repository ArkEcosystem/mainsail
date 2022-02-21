/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { HashInput, IHashFactory as Contract } from "@arkecosystem/crypto-contracts";
import { RIPEMD160, SHA256, Hash256 } from "bcrypto";

export class HashFactory implements Contract {
	public async ripemd160(data: HashInput): Promise<Buffer> {
		return RIPEMD160.digest(Array.isArray(data) ? Buffer.concat(data) : data);
	}

	public async sha256(data: HashInput): Promise<Buffer> {
		return SHA256.digest(Array.isArray(data) ? Buffer.concat(data) : data);
	}

	public async hash256(data: HashInput): Promise<Buffer> {
		return Hash256.digest(Array.isArray(data) ? Buffer.concat(data) : data);
	}
}
