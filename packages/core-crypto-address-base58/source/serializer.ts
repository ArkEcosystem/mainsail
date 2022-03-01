import { Container } from "@arkecosystem/core-container";
import { IAddressSerializer } from "@arkecosystem/core-crypto-contracts";
import ByteBuffer from "bytebuffer";

@Container.injectable()
export class AddressSerializer implements IAddressSerializer {
	public serialize(buffer: ByteBuffer, address: Buffer): void {
		buffer.writeBuffer(address);
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		return buffer.readBuffer(21);
	}
}
