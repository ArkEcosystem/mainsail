import { Container } from "@arkecosystem/core-container";
import { ISignature } from "@arkecosystem/core-crypto-contracts";
import { schnorr } from "bcrypto";
import ByteBuffer from "bytebuffer";

@Container.injectable()
export class Signature implements ISignature {
	public async sign(message: Buffer, privateKey: Buffer): Promise<string> {
		return schnorr.sign(message, privateKey).toString("hex");
	}

	public async verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> {
		return schnorr.verify(message, signature, publicKey);
	}

	public serialize(buffer: ByteBuffer, signature: string): void {
		buffer.append(signature, "hex");
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		if (typeof buffer.readBytes === "function") {
			return buffer.readBytes(64);
		}

		return buffer.readBuffer(64);
	}
}
