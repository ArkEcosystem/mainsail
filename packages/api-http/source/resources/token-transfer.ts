import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class TokenTransferResource implements Contracts.Api.Resource {
	public raw(resource: Models.TokenTransfer): object {
		return resource;
	}

	public transform(resource: Models.TokenTransfer): object {
		return resource;
	}
}
