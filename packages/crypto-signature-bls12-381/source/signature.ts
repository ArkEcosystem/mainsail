import { aggregateSignatures, PublicKey, SecretKey, Signature as Sig, verify } from "@chainsafe/blst";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class Signature implements Contracts.Crypto.Signature {
	public async sign(message: Buffer, privateKey: Buffer): Promise<string> {
		return Buffer.from(SecretKey.fromBytes(privateKey).sign(message).toBytes()).toString("hex");
	}

	public async verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> {
		return verify(message, PublicKey.fromBytes(publicKey), Sig.fromBytes(signature));
	}

	public serialize(buffer: ByteBuffer, signature: string): void {
		buffer.writeBytes(Buffer.from(signature, "hex"));
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		return buffer.readBytes(96);
	}

	public async aggregate(signatures: Buffer[]): Promise<string> {
		return Buffer.from(aggregateSignatures(signatures.map((s) => Sig.fromBytes(s))).toBytes()).toString("hex");
	}
}
