import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

export interface EnrichedWallet extends Models.Wallet {
	tokenCount?: number;
}

@injectable()
export class WalletResource implements Contracts.Api.Resource {
	public raw(resource: EnrichedWallet): object {
		return resource;
	}

	public transform(resource: EnrichedWallet): object {
		return resource;
	}
}
