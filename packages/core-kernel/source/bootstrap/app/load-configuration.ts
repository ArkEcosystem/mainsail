import { Kernel } from "@arkecosystem/core-contracts";
import { Identifiers, inject, injectable } from "../../ioc";
import { ConfigManager, ConfigRepository } from "../../services/config";
import { Bootstrapper } from "../interfaces";

@injectable()
export class LoadConfiguration implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Kernel.Application;

	public async bootstrap(): Promise<void> {
		await this.app
			.get<ConfigManager>(Identifiers.ConfigManager)
			.driver(this.app.get<ConfigRepository>(Identifiers.ConfigRepository).get<string>("configLoader", "local"))
			.loadConfiguration();
	}
}
