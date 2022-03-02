import { Container } from "@arkecosystem/core-container";
import { Crypto } from "@arkecosystem/core-contracts";
import { sign, verify } from "@noble/ed25519";
import ByteBuffer from "bytebuffer";

@Container.injectable()
export class Signature implements Crypto.ISignature {
	public async sign(message: Buffer, privateKey: Buffer): Promise<string> {
		return Buffer.from(await sign(message, privateKey)).toString("hex");
	}

	public async verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> {
		return verify(signature, message, publicKey);
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
