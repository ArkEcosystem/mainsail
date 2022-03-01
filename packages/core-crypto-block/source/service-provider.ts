import { BINDINGS, IBlock } from "@arkecosystem/core-crypto-contracts";
import { Container, Providers } from "@arkecosystem/core-kernel";

import { Block } from "./block";
import { INTERNAL_FACTORY } from "./container";
import { Deserializer } from "./deserializer";
import { BlockFactory } from "./factory";
import { IDFactory } from "./id.factory";
import { Serializer } from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(INTERNAL_FACTORY)
			.toFactory<IBlock>(
				(context: Container.interfaces.Context) => (data) => context.container.resolve(Block).init(data),
			);

		this.app.bind(BINDINGS.Block.Deserializer).to(Deserializer).inSingletonScope();
		this.app.bind(BINDINGS.Block.Factory).to(BlockFactory).inSingletonScope();
		this.app.bind(BINDINGS.Block.IDFactory).to(IDFactory).inSingletonScope();
		this.app.bind(BINDINGS.Block.Serializer).to(Serializer).inSingletonScope();
	}
}
