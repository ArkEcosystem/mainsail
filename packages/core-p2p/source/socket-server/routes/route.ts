import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container } from "@arkecosystem/core-kernel";
import Hapi from "@hapi/hapi";
import Joi from "joi";

import { Controller } from "../controllers/controller";

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

@Container.injectable()
export abstract class Route {
	@Container.inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	public register(server: Hapi.Server): void {
		const controller = this.getController(server);
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

	protected abstract getController(server: Hapi.Server): Controller;
}
