import { badData } from "@hapi/boom";
import { AbstractServer } from "@mainsail/api-common";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import * as Schemas from "./schemas/index.js";

@injectable()
export class Server extends AbstractServer {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "api-http")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	protected baseName(): string {
		return "Public API";
	}

	protected pluginConfiguration(): Contracts.Kernel.PluginConfiguration {
		return this.configuration;
	}

	protected defaultOptions(): Record<string, any> {
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

					options: {
						context: validateContext,
					},
				},
			},
		};
	}

	protected schemas(): any {
		return Schemas;
	}
}
