import type Hapi from "@hapi/hapi";
import type { Contracts } from "@mainsail/contracts";

import { badData } from "@hapi/boom";
import { AbstractServer } from "@mainsail/api-common";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";

@injectable()
export class Server extends AbstractServer {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "api-transaction-pool")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	protected baseName(): string {
		return "Transaction Pool API";
	}

	protected pluginConfiguration(): Contracts.Kernel.PluginConfiguration {
		return this.configuration;
	}

	protected defaultOptions(): Record<string, unknown> {
		const validateContext = {
			configuration: {
				plugins: {
					pagination: {
						limit: this.configuration.getRequired<number>("plugins.pagination.limit"),
					},
				},
			},
		};

		return {
			router: {
				stripTrailingSlash: true,
			},
			routes: {
				payload: {
					async failAction(request: Hapi.Request, h: Hapi.ResponseToolkit, error: Error) {
						return badData(error.message);
					},
				},
				validate: {
					async failAction(request: Hapi.Request, h: Hapi.ResponseToolkit, error: Error) {
						return badData(error.message);
					},
					options: {
						context: validateContext,
					},
				},
			},
		};
	}
}
