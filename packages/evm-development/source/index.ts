import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Deployer } from "./deployer";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {}

	public async boot(): Promise<void> {
		this.app
			.get<Contracts.Kernel.Logger>(Identifiers.Services.Log.Service)
			.info("Setting up EVM for development...");

		await this.app.resolve(Deployer).deploy();
	}
}
