import { inject } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Instance } from "./instance";

export class ServiceProvider extends Providers.ServiceProvider {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	public async register(): Promise<void> {
		this.logger.info("Booting EVM...");

		this.app.bind(Identifiers.Evm.Instance).to(Instance).inSingletonScope();
	}

	public async dispose(): Promise<void> {
		this.logger.info("Disposing EVM...");
	}
}
