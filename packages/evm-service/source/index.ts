import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { EvmInstance } from "./instances/index.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Evm.Instance).to(EvmInstance).inSingletonScope().whenTagged("instance", "evm");

		this.app.bind(Identifiers.Evm.Instance).to(EvmInstance).inRequestScope().whenTagged("instance", "validator");

		this.app
			.bind(Identifiers.Evm.Instance)
			.to(EvmInstance)
			.inSingletonScope()
			.whenTagged("instance", "transaction-pool");

		this.app.bind(Identifiers.Evm.Instance).to(EvmInstance).inSingletonScope().whenTagged("instance", "rpc");
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
