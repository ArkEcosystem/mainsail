import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

import { Resource } from "../types";

@injectable()
export class ValidatorRoundResource implements Resource {
	public raw(resource: Models.ValidatorRound): object {
		return resource;
	}

	public transform(resource: Models.ValidatorRound): object {
		return resource;
	}
}
