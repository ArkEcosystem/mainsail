import { Container } from "@arkecosystem/core-container";
import { Signatory as Contract } from "@arkecosystem/core-crypto-contracts";
import { sign, verify } from "@noble/ed25519";

@Container.injectable()
export class Signatory implements Contract {
	public async sign(message: Buffer, privateKey: Buffer): Promise<string> {
		return Buffer.from(await sign(message, privateKey)).toString("hex");
	}

	public async verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> {
		return verify(signature, message, publicKey);
	}
}
