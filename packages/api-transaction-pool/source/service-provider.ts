import { AbstractServiceProvider, Plugins, ServerConstructor } from "@mainsail/api-common";
import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";

import Handlers from "./handlers.js";
import { Server } from "./server.js";

@injectable()
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
		const config = this.config().getRequired<{
			trustProxy: boolean;
			whitelist: string[];
			socketTimeout: number;
			rateLimit: {
				blacklist: string[];
				duration: number;
				enabled: boolean;
				points: number;
				whitelist: string[];
			};
			pagination: {
				limit: number;
			};
		}>("plugins");

		return [
			{
				options: {
					trustProxy: config.trustProxy,
					whitelist: config.whitelist,
				},
				plugin: Plugins.whitelist,
			},
			{ plugin: Plugins.commaArrayQuery },
			{
				options: {
					...config.rateLimit,
					trustProxy: config.trustProxy,
				},
				plugin: Plugins.rateLimit,
			},
			{
				options: {
					query: {
						limit: {
							default: config.pagination.limit,
						},
					},
				},
				plugin: Plugins.pagination,
			},
		];
	}
}
