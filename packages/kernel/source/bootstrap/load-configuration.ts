import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ConfigManager, ConfigRepository } from "../services/config";
import { Bootstrapper } from "./interfaces";

@injectable()
export class LoadConfiguration implements Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	public async bootstrap(): Promise<void> {
		await this.app
			.get<ConfigManager>(Identifiers.Kernel.Config.Manager)
			.driver(
				this.app
					.get<ConfigRepository>(Identifiers.Kernel.Config.Repository)
					.get<string>("configLoader", "local"),
			)
			.loadConfiguration();
	}
}
