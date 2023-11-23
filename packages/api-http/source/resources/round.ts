import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class RoundResource implements Contracts.Api.Resource {
	public raw(resource: { publicKey: string; votes: string }): object {
		return resource;
	}

	public transform(resource: { publicKey: string; votes: string }): object {
		return {
			publicKey: resource.publicKey,
			votes: resource.votes,
		};
	}
}
