import { injectable } from "@mainsail/container";

import { Resource } from "../types";

@injectable()
export class PeerResource implements Resource {
	public raw(resource): object {
		return resource;
	}

	public transform(resource): object {
		return {
			height: resource.state ? resource.state.height : resource.height,
			ip: resource.ip,
			latency: resource.latency,
			plugins: resource.plugins,
			port: resource.port,
			ports: resource.ports,
			version: resource.version,
		};
	}
}
