import { Container } from "@arkecosystem/core-container";
import { Crypto } from "@arkecosystem/core-contracts";
import ByteBuffer from "bytebuffer";

@Container.injectable()
export class AddressSerializer implements Crypto.IAddressSerializer {
	public serialize(buffer: ByteBuffer, address: Buffer): void {
		buffer.writeBuffer(address);
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		return buffer.readBuffer(52);
	}
}
