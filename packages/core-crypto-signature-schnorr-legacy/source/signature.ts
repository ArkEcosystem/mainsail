import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { secp256k1 } from "bcrypto";
import ByteBuffer from "bytebuffer";

@injectable()
export class Signature implements Contracts.Crypto.ISignature {
	public async sign(message: Buffer, privateKey: Buffer): Promise<string> {
		return secp256k1.schnorrSign(message, privateKey).toString("hex");
	}

	public async verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> {
		return secp256k1.schnorrVerify(message, signature, publicKey);
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
