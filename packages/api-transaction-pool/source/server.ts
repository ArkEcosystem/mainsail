import { badData } from "@hapi/boom";
import { AbstractServer } from "@mainsail/api-common";
import { inject, injectable, tagged } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

@injectable()
export class Server extends AbstractServer {
	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "api-transaction-pool")
	private readonly configuration!: Providers.PluginConfiguration;

	protected baseName(): string {
		return "Transaction Pool API";
	}

	protected pluginConfiguration(): Providers.PluginConfiguration {
		return this.configuration;
	}

	protected defaultOptions(): Record<string, any> {
		return {
			router: {
				stripTrailingSlash: true,
			},
			routes: {
				payload: {
					/* istanbul ignore next */
					async failAction(request, h, error) {
						return badData(error.message);
					},
				},
				validate: {
					/* istanbul ignore next */
					async failAction(request, h, error) {
						return badData(error.message);
					},

				},
			},
		};
	}

	protected schemas(): any {
		return {};
	}
}
