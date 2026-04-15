import type { Contracts } from "@mainsail/contracts";

import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

@injectable()
export class ValidatorRoundResource implements Contracts.Api.Resource {
	public raw(resource: Models.ValidatorRound): object {
		return resource;
	}

	public transform(resource: Models.ValidatorRound): object {
		return resource;
	}
}
