import type { Contracts } from "@mainsail/contracts";

import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

@injectable()
export class TokenWhitelistResource implements Contracts.Api.Resource {
	public raw(resource: Models.TokenWhitelist): object {
		return resource;
	}

	public transform(resource: Models.TokenWhitelist): object {
		return resource;
	}
}
