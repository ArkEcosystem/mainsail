import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class PeerResource implements Contracts.Api.Resource {
	public raw(resource: Models.Peer): object {
		return resource;
	}

	public transform(resource: Models.Peer): object {
		return {
			height: resource.height,
			ip: resource.ip,
			latency: resource.latency,
			plugins: resource.plugins,
			port: resource.port,
			ports: resource.ports,
			version: resource.version,
		};
	}
}
