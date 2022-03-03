import { injectable } from "@arkecosystem/core-container";
import { Crypto } from "@arkecosystem/core-contracts";
import { ripemd160, sha256 } from "hash-wasm";

@injectable()
export class HashFactory implements Crypto.IHashFactory {
	public async ripemd160(data: Crypto.HashInput): Promise<Buffer> {
		return Buffer.from(await ripemd160(Array.isArray(data) ? Buffer.concat(data) : data), "hex");
	}

	public async sha256(data: Crypto.HashInput): Promise<Buffer> {
		return Buffer.from(await sha256(Array.isArray(data) ? Buffer.concat(data) : data), "hex");
	}

	public async hash256(data: Crypto.HashInput): Promise<Buffer> {
		return Buffer.from(
			await sha256(Buffer.from(await sha256(Array.isArray(data) ? Buffer.concat(data) : data), "hex")),
			"hex",
		);
	}
}
