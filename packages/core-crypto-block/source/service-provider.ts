import { BINDINGS } from "@arkecosystem/core-crypto-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { Deserializer } from "./deserializer";
import { BlockFactory } from "./factory";
import { IDFactory } from "./id.factory";
import { Serializer } from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(BINDINGS.Block.Deserializer).to(Deserializer).inSingletonScope();
		this.app.bind(BINDINGS.Block.Factory).to(BlockFactory).inSingletonScope();
		this.app.bind(BINDINGS.Block.IDFactory).to(IDFactory).inSingletonScope();
		this.app.bind(BINDINGS.Block.Serializer).to(Serializer).inSingletonScope();
	}
}
