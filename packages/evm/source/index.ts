import { Selectors } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { EphemeralInstance, EvmInstance, MockInstance } from "./instances/index.js";

export * as Bindings from "./generated/bindings.cjs";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Evm.Instance)
			.to(EvmInstance)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("instance", "evm"));

		this.app
			.bind(Identifiers.Evm.Instance)
			.to(EphemeralInstance)
			.inRequestScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("instance", "ephemeral"));

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
