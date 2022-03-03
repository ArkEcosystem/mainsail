import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { ripemd160, sha256 } from "hash-wasm";

@injectable()
export class HashFactory implements Contracts.Crypto.IHashFactory {
	public async ripemd160(data: Contracts.Crypto.HashInput): Promise<Buffer> {
		return Buffer.from(await ripemd160(Array.isArray(data) ? Buffer.concat(data) : data), "hex");
	}

	public async sha256(data: Contracts.Crypto.HashInput): Promise<Buffer> {
		return Buffer.from(await sha256(Array.isArray(data) ? Buffer.concat(data) : data), "hex");
	}

	public async hash256(data: Contracts.Crypto.HashInput): Promise<Buffer> {
		return Buffer.from(
			await sha256(Buffer.from(await sha256(Array.isArray(data) ? Buffer.concat(data) : data), "hex")),
			"hex",
		);
	}
}
