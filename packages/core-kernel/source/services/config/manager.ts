import { injectable } from "@arkecosystem/core-container";
import { Kernel } from "@arkecosystem/core-contracts";

import { InstanceManager } from "../../support/instance-manager";
import { LocalConfigLoader } from "./drivers";

@injectable()
export class ConfigManager extends InstanceManager<Kernel.ConfigLoader> {
	protected async createLocalDriver(): Promise<Kernel.ConfigLoader> {
		return this.app.resolve(LocalConfigLoader);
	}

	protected getDefaultDriver(): string {
		return "local";
	}
}
