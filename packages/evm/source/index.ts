import { Selectors } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { EvmInstance, MockInstance } from "./instances/index.js";

export * as Bindings from "./generated/bindings.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Evm.Instance)
			.to(EvmInstance)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("instance", "evm"));

		this.app
			.bind(Identifiers.Evm.Instance)
			.to(MockInstance)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("instance", "mock"));
	}

	public async boot(): Promise<void> {}

	public async dispose(): Promise<void> {
		// TODO
	}
}
