import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class LegacyColdWalletResource implements Contracts.Api.Resource {
	public raw(resource: Models.LegacyColdWallet): object {
		return resource;
	}

	public transform(resource: Models.LegacyColdWallet): object {
		return resource;
	}
}
