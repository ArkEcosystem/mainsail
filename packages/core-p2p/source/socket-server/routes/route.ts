import { inject, injectable } from "@mainsail/core-container";
import { Contracts, Identifiers } from "@mainsail/core-contracts";
import Hapi from "@hapi/hapi";
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

	public register(server: Hapi.Server): void {
		const controller = this.getController();
		server.bind(controller);
		for (const [path, config] of Object.entries(this.getRoutesConfigByPath())) {
			server.route({
				config: {
					handler: config.handler,
					id: config.id,
					isInternal: true,
					payload: {
						maxBytes: config.maxBytes,
					},
				},
				method: "POST",
				path,
			});
		}
	}

	public abstract getRoutesConfigByPath(): { [path: string]: RouteConfig };

	protected abstract getController(): Contracts.P2P.Controller;
}
