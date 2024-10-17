import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

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
