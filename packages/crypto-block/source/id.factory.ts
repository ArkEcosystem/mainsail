import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class IDFactory {
	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer!: Contracts.Crypto.BlockSerializer;

	public async make(data: Contracts.Crypto.BlockDataSerializable): Promise<string> {
		return (await this.hashFactory.sha256(await this.serializer.serializeHeader(data))).toString("hex");
	}
}
