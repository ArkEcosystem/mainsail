import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class BannedPeerResource implements Contracts.Api.Resource {
	public raw(resource: Contracts.P2P.Peer): object {
		return resource;
	}

	public transform(resource: Contracts.P2P.Peer): object {
		return resource;
	}
}
