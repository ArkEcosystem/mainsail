import { AbstractServiceProvider, Plugins, ServerConstructor } from "@mainsail/api-common";
import { Identifiers } from "@mainsail/contracts";

import Handlers from "./handlers.js";
import { Server } from "./server.js";

export class ServiceProvider extends AbstractServiceProvider<Server> {
	protected httpIdentifier(): symbol {
		return Identifiers.TransactionPool.API.HTTP;
	}

	protected httpsIdentifier(): symbol {
		return Identifiers.TransactionPool.API.HTTPS;
	}

	protected getServerConstructor(): ServerConstructor<Server> {
		return Server;
	}

	protected getHandlers(): any {
		return Handlers;
	}

	public async boot(): Promise<void> {}

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
