import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
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
