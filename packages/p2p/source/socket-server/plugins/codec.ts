import { inject, injectable, multiInject, postConstruct, tagged } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Route } from "../routes/route.js";
import { BasePlugin } from "./base-plugin.js";

let times: number[] = [];

@injectable()
export class CodecPlugin extends BasePlugin {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@multiInject(Identifiers.P2P.Routes)
	private readonly routes!: Route[];

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;


	@postConstruct()
	public init(): void {
		console.log("CodecPlugin initialized");

		this.eventDispatcher.listen(Events.ConsensusEvent.RoundStarted, {
			handle: (payload: { name: string }) => {
				console.log("Event received:", payload.name);

				times.sort((a, b) => a - b);
				console.log("Codec prevote processing times (ms):", times.map((time) => time.toFixed(3)).join(", "));

				times = [];
			}
		});
	}

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
					if (request.path === "/postPrevote") {
						const start = performance.now();

						request.payload = allRoutesConfigByPath[request.path].codec.request.deserialize(request.payload);

						const end = performance.now();
						times.push(end - start);
					} else {
						request.payload = allRoutesConfigByPath[request.path].codec.request.deserialize(request.payload);

					}
				} catch (error) {
					console.error(`Payload deserializing on ${request.path} failed: ${error}`);

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
