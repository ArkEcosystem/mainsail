import { Signatory as Contract } from "@arkecosystem/crypto-contracts";
import { secp256k1 } from "bcrypto";

export class Signatory implements Contract {
	public async sign(hash: Buffer, privateKey: Buffer): Promise<string> {
		return secp256k1.schnorrSign(hash, privateKey).toString("hex");
	}

	public async verify(hash: Buffer, signature: Buffer | string, publicKey: Buffer | string): Promise<boolean> {
		return secp256k1.schnorrVerify(
			hash,
			signature instanceof Buffer ? signature : Buffer.from(signature, "hex"),
			publicKey instanceof Buffer ? publicKey : Buffer.from(publicKey, "hex"),
		);
	}
}
