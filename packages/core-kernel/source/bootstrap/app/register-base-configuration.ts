import { Kernel } from "@arkecosystem/core-contracts";
import { Identifiers, inject, injectable } from "../../ioc";
import { ConfigManager, ConfigRepository } from "../../services/config";
import { KeyValuePair } from "../../types";
import { Bootstrapper } from "../interfaces";

@injectable()
export class RegisterBaseConfiguration implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Kernel.Application;

	@inject(Identifiers.ConfigRepository)
	private readonly configRepository!: ConfigRepository;

	public async bootstrap(): Promise<void> {
		this.app.bind<ConfigManager>(Identifiers.ConfigManager).to(ConfigManager).inSingletonScope();

		await this.app.get<ConfigManager>(Identifiers.ConfigManager).boot();

		this.configRepository.set("app.flags", this.app.get<KeyValuePair>(Identifiers.ConfigFlags));
		// @todo: better name for storing pluginOptions
		this.configRepository.set("app.pluginOptions", this.app.get<KeyValuePair>(Identifiers.ConfigPlugins));
	}
}
