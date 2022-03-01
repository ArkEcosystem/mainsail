import { Container } from "@arkecosystem/core-container";
import { IPublicKeySerializer } from "@arkecosystem/core-crypto-contracts";
import ByteBuffer from "bytebuffer";

@Container.injectable()
export class PublicKeySerializer implements IPublicKeySerializer {
	public serialize(buffer: ByteBuffer, publicKey: string): void {
		buffer.append(publicKey, "hex");
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		return buffer.readBuffer(48);
	}
}
