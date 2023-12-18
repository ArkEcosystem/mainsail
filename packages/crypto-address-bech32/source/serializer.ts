import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class AddressSerializer implements Contracts.Crypto.AddressSerializer {
	public serialize(buffer: ByteBuffer, address: Buffer): void {
		buffer.writeBytes(address);
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		return buffer.readBytes(52);
	}
}
