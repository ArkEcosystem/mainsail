import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class PeerResource implements Contracts.Api.Resource {
	public raw(resource: Contracts.P2P.Peer): object {
		return resource;
	}

	public transform(resource: Contracts.P2P.Peer): object {
		return {
			blockNumber: resource.header ? resource.header.blockNumber : undefined,
			ip: resource.ip,
			latency: resource.latency,
			plugins: resource.plugins,
			port: resource.port,
			ports: resource.ports,
			version: resource.version,
		};
	}
}
