import { Identifiers } from "@mainsail/constants";
import { inject, injectable, multiInject, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { BasePlugin } from "./base-plugin.js";

@injectable()
export class CodecPlugin extends BasePlugin {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@multiInject(Identifiers.P2P.Routes)
	private readonly routes!: Contracts.P2P.Route[];

	public register(server) {
		if (this.configuration.getRequired("developmentMode.enabled")) {
			return;
		}

		const allRoutesConfigByPath = this.routes.reduce(
			(accumulator, route) => ({ ...accumulator, ...route.getRoutesConfigByPath() }),
			{},
		);

		server.ext({
			async method(request, h) {
				try {
					request.payload = allRoutesConfigByPath[request.path].codec.request.deserialize(request.payload);
				} catch (error) {
					return this.disposeAndReturnBadRequest(request, h, `Payload deserializing failed: ${error}`);
				}
				return h.continue;
			},
			type: "onPostAuth",
		});

		server.ext({
			method: async (request, h) => {
				try {
					if (request.response.source !== undefined) {
						request.response.source = allRoutesConfigByPath[request.path].codec.response.serialize(
							request.response.source,
						);
					} else {
						// if we're here it's because there was some error thrown, error description is in request.response.output.payload
						// as response payload needs to be Buffer, we convert error message to Buffer
						const errorMessage =
							request.response.output?.payload?.message ??
							request.response.output?.payload?.error ??
							"Error";
						request.response.output.payload = Buffer.from(errorMessage, "utf8");
					}
				} catch (error) {
					request.response.statusCode = 500; // Internal server error (serializing failed)
					request.response.output = {
						headers: {},
						payload: Buffer.from("Internal server error"),
						statusCode: 500,
					};

					this.logger.error(`Response serializing on ${request.path} failed: ${error}`, "p2p");
				}
				return h.continue;
			},
			type: "onPreResponse",
		});
	}
}
