import type { Contracts } from "@mainsail/contracts";

import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

@injectable()
export class TokenHolderResource implements Contracts.Api.Resource {
	public raw(resource: Models.TokenHolder): object {
		return resource;
	}

	public transform(resource: Models.TokenHolder): object {
		return resource;
	}
}
