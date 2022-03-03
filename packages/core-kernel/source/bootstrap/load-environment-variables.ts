import { inject, injectable } from "@arkecosystem/core-container";
import { Identifiers, Contracts } from "@arkecosystem/core-contracts";

import { ConfigManager, ConfigRepository } from "../services/config";
import { Bootstrapper } from "./interfaces";

@injectable()
export class LoadEnvironmentVariables implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public async bootstrap(): Promise<void> {
		const configRepository: ConfigRepository = this.app.get<ConfigRepository>(Identifiers.ConfigRepository);

		await this.app
			.get<ConfigManager>(Identifiers.ConfigManager)
			.driver(configRepository.get<string>("configLoader", "local"))
			.loadEnvironmentVariables();
	}
}
