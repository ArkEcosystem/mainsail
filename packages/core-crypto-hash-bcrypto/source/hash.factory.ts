import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { Hash256, RIPEMD160, SHA256 } from "bcrypto";

@injectable()
export class HashFactory implements Contracts.Crypto.IHashFactory {
	public async ripemd160(data: Contracts.Crypto.HashInput): Promise<Buffer> {
		return RIPEMD160.digest(Array.isArray(data) ? Buffer.concat(data) : data);
	}

	public async sha256(data: Contracts.Crypto.HashInput): Promise<Buffer> {
		return SHA256.digest(Array.isArray(data) ? Buffer.concat(data) : data);
	}

	public async hash256(data: Contracts.Crypto.HashInput): Promise<Buffer> {
		return Hash256.digest(Array.isArray(data) ? Buffer.concat(data) : data);
	}
}
