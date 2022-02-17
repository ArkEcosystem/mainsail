import { Container, Providers } from "@arkecosystem/core-kernel";

import { Resource } from "../interfaces";

@Container.injectable()
export class PortsResource implements Resource {
	@Container.inject(Container.Identifiers.ServiceProviderRepository)
	protected readonly serviceProviderRepository!: Providers.ServiceProviderRepository;

	public raw(resource): object {
		return resource;
	}

	public transform(resource): object {
		const result = {};
		const keys = new Set(["@arkecosystem/core-p2p", "@arkecosystem/core-api", "@arkecosystem/core-webhooks"]);

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
