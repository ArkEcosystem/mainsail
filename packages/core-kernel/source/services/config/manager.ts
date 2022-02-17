import { ConfigLoader } from "../../contracts/kernel/config";
import { injectable } from "../../ioc";
import { InstanceManager } from "../../support/instance-manager";
import { LocalConfigLoader } from "./drivers";

@injectable()
export class ConfigManager extends InstanceManager<ConfigLoader> {
	protected async createLocalDriver(): Promise<ConfigLoader> {
		return this.app.resolve(LocalConfigLoader);
	}

	protected getDefaultDriver(): string {
		return "local";
	}
}
