import { Container } from "@arkecosystem/core-container";
import { HashInput, IHashFactory as Contract } from "@arkecosystem/core-crypto-contracts";
import { ripemd160, sha256 } from "hash-wasm";

@Container.injectable()
export class HashFactory implements Contract {
	public async ripemd160(data: HashInput): Promise<Buffer> {
		return Buffer.from(await ripemd160(Array.isArray(data) ? Buffer.concat(data) : data), "hex");
	}

	public async sha256(data: HashInput): Promise<Buffer> {
		return Buffer.from(await sha256(Array.isArray(data) ? Buffer.concat(data) : data), "hex");
	}

	public async hash256(data: HashInput): Promise<Buffer> {
		return Buffer.from(
			await sha256(Buffer.from(await sha256(Array.isArray(data) ? Buffer.concat(data) : data), "hex")),
			"hex",
		);
	}
}
