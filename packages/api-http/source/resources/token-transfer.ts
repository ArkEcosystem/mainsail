import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class TokenTransferResource implements Contracts.Api.Resource {
	public raw(resource: Models.TokenAction): object {
		return resource;
	}

	public transform(resource: Models.TokenAction): object {
		return resource;
	}
}
