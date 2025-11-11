import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";

import { ConfigManager, ConfigRepository } from "../services/config/index.js";

@injectable()
export class LoadEnvironmentVariables implements Contracts.Kernel.Bootstrapper {
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
