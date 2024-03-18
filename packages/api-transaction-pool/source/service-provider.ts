import { AbstractServiceProvider, Plugins, ServerConstructor } from "@mainsail/api-common";

import Handlers from "./handlers.js";
import { Identifiers as ApiTransactionPoolIdentifiers } from "./identifiers.js";
import { Server } from "./server.js";

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

	protected getHandlers(): any {
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
