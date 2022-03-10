import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { ByteBuffer } from "@arkecosystem/utils";
import { sign, verify } from "@noble/ed25519";

@injectable()
export class Signature implements Contracts.Crypto.ISignature {
	public async sign(message: Buffer, privateKey: Buffer): Promise<string> {
		return Buffer.from(await sign(message, privateKey)).toString("hex");
	}

	public async verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> {
		return verify(signature, message, publicKey);
	}

	public serialize(buffer: ByteBuffer, signature: string): void {
		buffer.writeBytes(Buffer.from(signature, "hex"));
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		return buffer.readBytes(64);
	}
}
