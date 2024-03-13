import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ConfigManager, ConfigRepository } from "../services/config/index.js";
import { Bootstrapper } from "./interfaces.js";

@injectable()
export class LoadEnvironmentVariables implements Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	public async bootstrap(): Promise<void> {
		const configRepository: ConfigRepository = this.app.get<ConfigRepository>(Identifiers.Config.Repository);

		await this.app
			.get<ConfigManager>(Identifiers.Services.Config.Manager)
			.driver(configRepository.get<string>("configLoader", "local"))
			.loadEnvironmentVariables();
	}
}
