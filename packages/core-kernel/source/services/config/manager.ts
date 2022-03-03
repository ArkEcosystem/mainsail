import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

import { InstanceManager } from "../../support/instance-manager";
import { LocalConfigLoader } from "./drivers";

@injectable()
export class ConfigManager extends InstanceManager<Contracts.Kernel.ConfigLoader> {
	protected async createLocalDriver(): Promise<Contracts.Kernel.ConfigLoader> {
		return this.app.resolve(LocalConfigLoader);
	}

	protected getDefaultDriver(): string {
		return "local";
	}
}
