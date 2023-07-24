import Hapi from "@hapi/hapi";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

export type Codec = {
	request: {
		serialize: any;
		deserialize: any;
	};
	response: {
		serialize: any;
		deserialize: any;
	};
};

export type RouteConfig = {
	id: string;
	handler: any;
	validation?: Joi.Schema;
	codec: Codec;
	maxBytes?: number;
};

@injectable()
export abstract class Route {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	public register(server: Hapi.Server): void {
		const controller = this.getController();
		server.bind(controller);
		for (const [path, config] of Object.entries(this.getRoutesConfigByPath())) {
			server.route({
				method: "POST",
				options: {
					handler: config.handler,
					id: config.id,
					isInternal: !this.configuration.getRequired("developmentMode.enabled"), // Routes are exposed when developmentMode is enabled
					payload: {
						maxBytes: config.maxBytes,
					},
					validate: {
						payload: config.validation,
					},
				},
				path,
			});
		}
	}

	public abstract getRoutesConfigByPath(): { [path: string]: RouteConfig };

	protected abstract getController(): Contracts.P2P.Controller;
}
