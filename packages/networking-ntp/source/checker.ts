import Sntp from "@hapi/sntp";
import { Contracts } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

@injectable()
export class Checker {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "networking-dns")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async execute(): Promise<void> {
		const timeout: number = this.configuration.get("timeout");

		for (const host of Utils.shuffle(this.configuration.get<string[]>("hosts"))) {
			try {
				await Sntp.time({
					host,
					timeout,
				});

				return;
			} catch (error) {
				this.logger.error(`Host ${host} responded with: ${error.message}`);
			}
		}

		throw new Error("Please check your NTP connectivity, couldn't connect to any host.");
	}
}
