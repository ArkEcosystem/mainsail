import { injectable } from "@mainsail/core-container";
import { Contracts } from "@mainsail/core-contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class PublicKeySerializer implements Contracts.Crypto.IPublicKeySerializer {
	public serialize(buffer: ByteBuffer, publicKey: string): void {
		buffer.writeBytes(Buffer.from(publicKey, "hex"));
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		return buffer.readBytes(33);
	}
}
