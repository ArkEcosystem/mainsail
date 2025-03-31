import { Selectors } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { MainEvm, RpcEvm, TransactionPoolEvm, ValidatorEvm } from "./instances/index.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Evm.Instance)
			.to(MainEvm)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("instance", "evm"));

		this.app
			.bind(Identifiers.Evm.Instance)
			.to(ValidatorEvm)
			.inRequestScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("instance", "validator"));

		this.app
			.bind(Identifiers.Evm.Instance)
			.to(TransactionPoolEvm)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("instance", "transaction-pool"));

		this.app
			.bind(Identifiers.Evm.Instance)
			.to(RpcEvm)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("instance", "rpc"));
	}

	public async boot(): Promise<void> {}

	public async dispose(): Promise<void> {
		for (const tag of ["evm", "validator", "transaction-pool", "rpc"]) {
			if (this.app.isBoundTagged(Identifiers.Evm.Instance, "instance", tag)) {
				{
					await this.app
						.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", tag)
						.dispose();
				}
			}
		}
	}
}
