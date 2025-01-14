import { Selectors } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { EphemeralInstance, EvmInstance } from "./instances/index.js";

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
			.when(Selectors.anyAncestorOrTargetTaggedFirst("instance", "validator"));

		this.app
			.bind(Identifiers.Evm.Instance)
			.to(EphemeralInstance)
			.inRequestScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("instance", "transaction-pool"));
	}

	public async boot(): Promise<void> {}

	public async dispose(): Promise<void> {
		for (const tag of ["evm", "validator", "transaction-pool"]) {
			if (this.app.isBoundTagged(Identifiers.Evm.Instance, "instance", tag)) {
				{
					await this.app.getTagged<EvmInstance>(Identifiers.Evm.Instance, "instance", tag).dispose();
				}
			}
		}
	}
}
