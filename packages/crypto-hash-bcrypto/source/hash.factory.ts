import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Hash256, Keccak256, RIPEMD160, SHA256 } from "bcrypto";

@injectable()
export class HashFactory implements Contracts.Crypto.HashFactory {
	public ripemd160(data: Contracts.Crypto.HashInput): Buffer {
		return RIPEMD160.digest(Array.isArray(data) ? Buffer.concat(data) : data);
	}

	public sha256(data: Contracts.Crypto.HashInput): Buffer {
		return SHA256.digest(Array.isArray(data) ? Buffer.concat(data) : data);
	}

	public hash256(data: Contracts.Crypto.HashInput): Buffer {
		return Hash256.digest(Array.isArray(data) ? Buffer.concat(data) : data);
	}

	public keccak256(data: Contracts.Crypto.HashInput): Buffer {
		return Keccak256.digest(Array.isArray(data) ? Buffer.concat(data) : data);
	}
}
