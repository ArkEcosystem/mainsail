import { inject, injectable } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Resource } from "../types";

@injectable()
export class PortsResource implements Resource {
	@inject(Identifiers.ServiceProviderRepository)
	protected readonly serviceProviderRepository!: Providers.ServiceProviderRepository;

	public raw(resource): object {
		return resource;
	}

	public transform(resource): object {
		const result = {};
		const keys = new Set(["@mainsail/p2p", "@mainsail/api", "@mainsail/core-webhooks"]);

		for (const serviceProvider of this.serviceProviderRepository.allLoadedProviders()) {
			const name: string = serviceProvider.name()!;
			const options: Record<string, any> = serviceProvider.config().all();

			if (keys.has(name) && options.enabled) {
				if (options.server && options.server.enabled) {
					result[name] = +options.server.port;

					continue;
				}

				result[name] = +options.port;
			}
		}

		return result;
	}
}
