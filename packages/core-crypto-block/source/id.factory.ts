import { inject, injectable } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";

import { Serializer } from "./serializer";

@injectable()
export class IDFactory {
	@inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory: Crypto.IHashFactory;

	@inject(Identifiers.Cryptography.Block.Serializer)
	private readonly serializer: Serializer; // @TODO: create contract for block serializer

	public async make(data: Crypto.IBlockData): Promise<string> {
		return (await this.hashFactory.sha256(this.serializer.serialize(data))).toString("hex");
	}
}
