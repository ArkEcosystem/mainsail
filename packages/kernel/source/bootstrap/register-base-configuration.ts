import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ConfigManager, ConfigRepository } from "../services/config";
import { KeyValuePair } from "../types";
import { Bootstrapper } from "./interfaces";

@injectable()
export class RegisterBaseConfiguration implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Kernel.Config.Repository)
	private readonly configRepository!: ConfigRepository;

	public async bootstrap(): Promise<void> {
		this.app.bind<ConfigManager>(Identifiers.Kernel.Config.Manager).to(ConfigManager).inSingletonScope();

		await this.app.get<ConfigManager>(Identifiers.Kernel.Config.Manager).boot();

		this.configRepository.set("app.flags", this.app.get<KeyValuePair>(Identifiers.Kernel.Config.Flags));
		// @@TODO better name for storing pluginOptions
		this.configRepository.set("app.pluginOptions", this.app.get<KeyValuePair>(Identifiers.Kernel.Config.Plugins));
	}
}
