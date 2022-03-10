import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { ByteBuffer } from "@arkecosystem/utils";

@injectable()
export class PublicKeySerializer implements Contracts.Crypto.IPublicKeySerializer {
	public serialize(buffer: ByteBuffer, publicKey: string): void {
		buffer.writeBytes(Buffer.from(publicKey, "hex"));
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		return buffer.readBytes(48);
	}
}
