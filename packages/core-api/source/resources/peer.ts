import { Container } from "@arkecosystem/core-kernel";

import { Resource } from "../interfaces";

@Container.injectable()
export class PeerResource implements Resource {
	public raw(resource): object {
		return resource;
	}

	public transform(resource): object {
		return {
			ip: resource.ip,
			port: resource.port,
			ports: resource.ports,
			version: resource.version,
			height: resource.state ? resource.state.height : resource.height,
			latency: resource.latency,
			plugins: resource.plugins,
		};
	}
}
