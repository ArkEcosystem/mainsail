import { inject, injectable, tagged } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers, Utils } from "@arkecosystem/core-kernel";
import dns from "dns";
import util from "util";

@injectable()
export class Checker {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "core-networking-dns")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async execute(): Promise<void> {
		const lookupService = util.promisify(dns.lookupService);

		for (const host of Utils.shuffle(this.configuration.get<string[]>("hosts"))) {
			try {
				await lookupService(host, 53);

				return;
			} catch (error) {
				this.logger.error(error.message);
			}
		}

		throw new Error("Please check your DNS connectivity, couldn't connect to any host.");
	}
}
