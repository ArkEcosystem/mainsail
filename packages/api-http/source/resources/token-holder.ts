import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class TokenHolderResource implements Contracts.Api.Resource {
	public raw(resource: Models.TokenHolder): object {
		return resource;
	}

	public transform(resource: Models.TokenHolder): object {
		return resource;
	}
}
