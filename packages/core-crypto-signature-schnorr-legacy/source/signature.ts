import { Container } from "@arkecosystem/core-container";
import { ISignature } from "@arkecosystem/core-crypto-contracts";
import { secp256k1 } from "bcrypto";
import ByteBuffer from "bytebuffer";

@Container.injectable()
export class Signature implements ISignature {
	public async sign(message: Buffer, privateKey: Buffer): Promise<string> {
		return secp256k1.schnorrSign(message, privateKey).toString("hex");
	}

	public async verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> {
		return secp256k1.schnorrVerify(message, signature, publicKey);
	}

	public serialize(buffer: ByteBuffer, signature: string): void {
        buffer.append(signature, "hex");
	}

	public deserialize(buffer: ByteBuffer): string {
		return buffer.readBytes(64).toString("hex");
	}
}
