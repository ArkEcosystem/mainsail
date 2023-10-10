import { Contracts } from "@mainsail/api-common";
import { injectable } from "@mainsail/container";

@injectable()
export class RoundResource implements Contracts.Resource {
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
