import type { Contracts } from "@mainsail/contracts";

import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

@injectable()
export class ValidatorResource implements Contracts.Api.Resource {
	public raw(resource: Models.Wallet): object {
		return resource;
	}

	public transform(resource: Models.Wallet): object {
		return resource;
	}
}
