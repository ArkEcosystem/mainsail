import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";

@injectable()
export class RoundResource implements Contracts.Api.Resource {
	public raw(resource: { address: string; votes: string }): object {
		return resource;
	}

	public transform(resource: { address: string; votes: string }): object {
		return {
			address: resource.address,
			votes: resource.votes,
		};
	}
}
