import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import ByteBuffer from "bytebuffer";

@injectable()
export class PublicKeySerializer implements Contracts.Crypto.IPublicKeySerializer {
	public serialize(buffer: ByteBuffer, publicKey: string): void {
		buffer.append(publicKey, "hex");
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		if (typeof buffer.readBytes === "function") {
			return buffer.readBytes(33);
		}

		return buffer.readBuffer(33);
	}
}
