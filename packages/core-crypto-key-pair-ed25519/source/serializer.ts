import { Container } from "@arkecosystem/core-container";
import { Crypto } from "@arkecosystem/core-contracts";
import ByteBuffer from "bytebuffer";

@Container.injectable()
export class PublicKeySerializer implements Crypto.IPublicKeySerializer {
	public serialize(buffer: ByteBuffer, publicKey: string): void {
		buffer.append(publicKey, "hex");
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		if (typeof buffer.readBytes === "function") {
			return buffer.readBytes(32);
		}

		return buffer.readBuffer(32);
	}
}
