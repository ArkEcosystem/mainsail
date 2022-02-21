/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { IHashFactory as Contract } from "@arkecosystem/crypto-contracts";
import { RIPEMD160, SHA256, Hash256 } from "bcrypto";

export class HashFactory implements Contract {
	public async ripemd160(data: Buffer): Promise<Buffer> {
		return RIPEMD160.digest(data);
	}

	public async sha256(data: Buffer): Promise<Buffer> {
		return SHA256.digest(data);
	}

	public async hash256(data: Buffer): Promise<Buffer> {
		return Hash256.digest(data);
	}
}
