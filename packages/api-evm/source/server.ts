import { badData } from "@hapi/boom";
import type Hapi from "@hapi/hapi";
import { AbstractServer } from "@mainsail/api-common";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class Server extends AbstractServer {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "api-evm")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	protected baseName(): string {
		return "EVM API";
	}

	protected pluginConfiguration(): Contracts.Kernel.PluginConfiguration {
		return this.configuration;
	}

	protected defaultOptions(): Record<string, unknown> {
		const validateContext = {
			configuration: {
				plugins: {},
			},
		};

		return {
			router: {
				stripTrailingSlash: true,
			},
			routes: {
				payload: {
					/* istanbul ignore next */
					async failAction(request: Hapi.Request, h: Hapi.ResponseToolkit, error: Error) {
						return badData(error.message);
					},
				},
				validate: {
					/* istanbul ignore next */
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
