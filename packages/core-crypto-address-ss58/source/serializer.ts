import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { ByteBuffer } from "@arkecosystem/utils";

@injectable()
export class AddressSerializer implements Contracts.Crypto.IAddressSerializer {
	public serialize(buffer: ByteBuffer, address: Buffer): void {
		buffer.writeBytes(address);
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		return buffer.readBytes(32);
	}
}
