import { Container } from "@arkecosystem/core-container";
import { Signatory as Contract } from "@arkecosystem/core-crypto-contracts";
import { secp256k1 } from "bcrypto";

@Container.injectable()
export class Signatory implements Contract {
	public async sign(message: Buffer, privateKey: Buffer): Promise<string> {
		return secp256k1.schnorrSign(message, privateKey).toString("hex");
	}

	public async verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> {
		return secp256k1.schnorrVerify(message, signature, publicKey);
	}
}
