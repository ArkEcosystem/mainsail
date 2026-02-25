import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class TokenWhitelistResource implements Contracts.Api.Resource {
	public raw(resource: Models.TokenWhitelist): object {
		return resource;
	}

	public transform(resource: Models.TokenWhitelist): object {
		return resource;
	}
}
