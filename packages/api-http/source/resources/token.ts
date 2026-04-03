import type { Contracts } from "@mainsail/contracts";

import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

@injectable()
export class TokenResource implements Contracts.Api.Resource {
	public raw(resource: Models.Token): object {
		return resource;
	}

	public transform(resource: Models.Token): object {
		return resource;
	}
}
