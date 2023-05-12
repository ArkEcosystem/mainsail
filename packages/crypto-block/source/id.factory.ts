import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class IDFactory {
	@inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory: Contracts.Crypto.IHashFactory;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer: Contracts.Crypto.IBlockSerializer;

	public async make(data: Contracts.Crypto.IBlockData): Promise<string> {
		return (await this.hashFactory.sha256(await this.serializer.serialize(data))).toString("hex");
	}
}
