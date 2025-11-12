import Hapi from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

@injectable()
export abstract class Route implements Contracts.P2P.Route {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	public register(server: Hapi.Server): void {
		const controller = this.getController();
		server.bind(controller);
		for (const [path, config] of Object.entries(this.getRoutesConfigByPath())) {
			server.route({
				method: "POST",
				options: {
					handler: controller.handle.bind(controller),
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

	public abstract getRoutesConfigByPath(): { [path: string]: Contracts.P2P.RouteConfig };

	protected abstract getController(): Contracts.P2P.Controller;
}
