import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class Serializer implements Contracts.Crypto.SignatureSerializer {
	@inject(Identifiers.Cryptography.Signature.Size)
	private readonly signatureSize!: number;

	public serialize(buffer: ByteBuffer, signature: string): void {
		buffer.writeBytes(Buffer.from(signature, "hex"));
	}

	public deserialize(buffer: ByteBuffer): Buffer {
		return buffer.readBytes(this.signatureSize);
	}
}
