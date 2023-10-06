import { Contracts } from "@mainsail/api-common";
import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

@injectable()
export class ValidatorRoundResource implements Contracts.Resource {
	public raw(resource: Models.ValidatorRound): object {
		return resource;
	}

	public transform(resource: Models.ValidatorRound): object {
		return resource;
	}
}
