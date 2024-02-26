import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { Deployer } from "./deployer";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	public async register(): Promise<void> { }

	public async boot(): Promise<void> {
		this.logger.info("Setting up EVM for development...");

		await this.app.resolve(Deployer).deploy();
	}
}
