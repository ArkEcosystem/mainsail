import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ConfigManager, ConfigRepository } from "../services/config/index.js";
import { KeyValuePair } from "../types/index.js";

@injectable()
export class RegisterBaseConfiguration implements Contracts.Kernel.Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Config.Repository)
	private readonly configRepository!: ConfigRepository;

	public async bootstrap(): Promise<void> {
		this.app.bind<ConfigManager>(Identifiers.Services.Config.Manager).to(ConfigManager).inSingletonScope();

		await this.app.get<ConfigManager>(Identifiers.Services.Config.Manager).boot();

		this.configRepository.set("app.flags", this.app.get<KeyValuePair>(Identifiers.Config.Flags));
		// @@TODO better name for storing pluginOptions
		this.configRepository.set("app.pluginOptions", this.app.get<KeyValuePair>(Identifiers.Config.Plugins));
	}
}
