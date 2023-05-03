import { injectable } from "@mainsail/core-container";
import { Contracts } from "@mainsail/core-contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class AddressSerializer implements Contracts.Crypto.IAddressSerializer {
	public serialize(buffer: ByteBuffer, address: Buffer): void {
		buffer.writeBytes(address);
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		return buffer.readBytes(20);
	}
}
