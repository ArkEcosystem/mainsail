import { injectable } from "@mainsail/container";
import { Contracts, Exceptions } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";
import { schnorr } from "bcrypto";

@injectable()
export class Signature implements Contracts.Crypto.Signature {
	public async sign(message: Buffer, privateKey: Buffer): Promise<string> {
		return schnorr.sign(message, privateKey).toString("hex");
	}

	public async verify(signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> {
		return schnorr.verify(message, signature, publicKey);
	}

	public serialize(buffer: ByteBuffer, signature: string): void {
		buffer.writeBytes(Buffer.from(signature, "hex"));
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		return buffer.readBytes(64);
	}

	public async aggregate(signatures: Buffer[]): Promise<string> {
		throw new Exceptions.NotImplemented(this.constructor.name, "aggregate");
	}
}
