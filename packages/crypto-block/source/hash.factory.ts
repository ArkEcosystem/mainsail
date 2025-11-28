import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class HashFactory {
	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer!: Contracts.Crypto.BlockSerializer;

	public async make(data: Contracts.Crypto.BlockHeaderSerializable): Promise<string> {
		const buffer = await this.hashFactory.sha256(await this.serializer.serializeHeader(data))
		return buffer.toString("hex");
	}
}
