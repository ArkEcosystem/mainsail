import { Signatory as Contract } from "@arkecosystem/crypto-contracts";
import { sign, verify } from "@noble/bls12-381";

export class Signatory implements Contract {
	public async sign(hash: Buffer, privateKey: Buffer): Promise<string> {
		return Buffer.from(await sign(hash, privateKey)).toString("hex");
	}

	public async verify(hash: Buffer, signature: Buffer | string, publicKey: Buffer | string): Promise<boolean> {
		return verify(signature, hash, publicKey);
	}
}
