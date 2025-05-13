import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { InstanceManager } from "../../support/instance-manager.js";
import { LocalConfigLoader } from "./drivers/index.js";

@injectable()
export class ConfigManager extends InstanceManager<Contracts.Kernel.ConfigLoader> {
	protected async createLocalDriver(): Promise<Contracts.Kernel.ConfigLoader> {
		return this.app.resolve(LocalConfigLoader);
	}

	protected getDefaultDriver(): string {
		return "local";
	}
}
