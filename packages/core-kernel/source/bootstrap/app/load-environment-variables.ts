import { Application } from "../../contracts/kernel";
import { Identifiers, inject, injectable } from "../../ioc";
import { ConfigManager, ConfigRepository } from "../../services/config";
import { Bootstrapper } from "../interfaces";

@injectable()
export class LoadEnvironmentVariables implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	public async bootstrap(): Promise<void> {
		const configRepository: ConfigRepository = this.app.get<ConfigRepository>(Identifiers.ConfigRepository);

		await this.app
			.get<ConfigManager>(Identifiers.ConfigManager)
			.driver(configRepository.get<string>("configLoader", "local"))
			.loadEnvironmentVariables();
	}
}
