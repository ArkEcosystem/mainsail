import { Container } from "@arkecosystem/core-container";
import { BINDINGS, IBlockData, IHashFactory } from "@arkecosystem/core-crypto-contracts";

import { Serializer } from "./serializer";

@Container.injectable()
export class IdFactory {
	@Container.inject(BINDINGS.HashFactory)
	private readonly hashFactory: IHashFactory;

	@Container.inject(BINDINGS.Block.Serializer)
	private readonly serializer: Serializer; // @TODO: create contract for block serializer

	public async make(data: IBlockData): Promise<string> {
		return (await this.hashFactory.sha256(this.serializer.serialize(data))).toString("hex");
	}
}
