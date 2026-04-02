import type { Contracts } from "@mainsail/contracts";

import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

@injectable()
export class LegacyColdWalletResource implements Contracts.Api.Resource {
	public raw(resource: Models.LegacyColdWallet): object {
		return resource;
	}

	public transform(resource: Models.LegacyColdWallet): object {
		return resource;
	}
}
