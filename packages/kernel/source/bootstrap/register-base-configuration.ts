import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { ConfigManager, ConfigRepository } from "../services/config/index.js";

@injectable()
export class RegisterBaseConfiguration implements Contracts.Kernel.Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Config.Repository)
	private readonly configRepository!: ConfigRepository;

	public async bootstrap(): Promise<void> {
		this.app.bind<ConfigManager>(Identifiers.Services.Config.Manager).to(ConfigManager).inSingletonScope();

		await this.app.get<ConfigManager>(Identifiers.Services.Config.Manager).boot();

		this.configRepository.set("app.flags", this.app.get<Contracts.Types.KeyValuePair>(Identifiers.Config.Flags));
	}
}
