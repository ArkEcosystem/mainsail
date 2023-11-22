import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { Resource } from "../types";

@injectable()
export class PeerResource implements Resource {
	public raw(resource: Contracts.P2P.Peer): object {
		return resource;
	}

	public transform(resource: Contracts.P2P.Peer): object {
		return {
			height: resource.header ? resource.header.height : undefined,
			ip: resource.ip,
			latency: resource.latency,
			plugins: resource.plugins,
			port: resource.port,
			ports: resource.ports,
			version: resource.version,
		};
	}
}
