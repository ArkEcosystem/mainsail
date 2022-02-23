import { Container } from "@arkecosystem/container";
import { Signatory as Contract } from "@arkecosystem/crypto-contracts";
import { schnorr } from "bcrypto";

@Container.injectable()
export class Signatory implements Contract {
	public async sign(message: Buffer, privateKey: Buffer): Promise<string> {
		return schnorr.sign(message, privateKey).toString("hex");
	}

	public async verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> {
		return schnorr.verify(message, signature, publicKey);
	}
}
