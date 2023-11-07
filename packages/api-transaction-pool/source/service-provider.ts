import { AbstractServiceProvider, Plugins, ServerConstructor } from "@mainsail/api-common";

import Handlers from "./handlers";
import { Identifiers as ApiTransactionPoolIdentifiers } from "./identifiers";
import { Server } from "./server";

export class ServiceProvider extends AbstractServiceProvider<Server> {
	protected httpIdentifier(): symbol {
		return ApiTransactionPoolIdentifiers.HTTP;
	}

	protected httpsIdentifier(): symbol {
		return ApiTransactionPoolIdentifiers.HTTPS;
	}

	protected getServerConstructor(): ServerConstructor<Server> {
		return Server;
	}

	protected getHandlers(): any | any[] {
		return Handlers;
	}

	protected getPlugins(): any[] {
		const config = this.config().get<any>("plugins");

		return [
			{
				options: {
					trustProxy: config.trustProxy,
					whitelist: config.whitelist,
				},
				plugin: Plugins.whitelist,
			},
			{ plugin: Plugins.hapiAjv },
			{
				options: {
					...config.rateLimit,
					trustProxy: config.trustProxy,
				},
				plugin: Plugins.rateLimit,
			},
		];
	}
}
