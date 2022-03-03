import { interfaces } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { Block } from "./block";
import { INTERNAL_FACTORY } from "./container";
import { Deserializer } from "./deserializer";
import { BlockFactory } from "./factory";
import { IDFactory } from "./id.factory";
import { Serializer } from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(INTERNAL_FACTORY).toFactory<Contracts.Crypto.IBlock>(
			// @ts-ignore
			(context: interfaces.Context) => (data) => context.container.resolve(Block).init(data),
		);

		this.app.bind(Identifiers.Cryptography.Block.Deserializer).to(Deserializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Block.Factory).to(BlockFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Block.IDFactory).to(IDFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Block.Serializer).to(Serializer).inSingletonScope();
	}
}
