import { BigNumber } from "@mainsail/utils";

import { Resource } from "../types";

@injectable()
export class RoundResource implements Resource {
	public raw(resource): object {
		return resource;
	}

	public transform(resource): object {
		return {
			publicKey: resource.publicKey,
			votes: BigNumber.make(resource.balance).toFixed(),
		};
	}
}
