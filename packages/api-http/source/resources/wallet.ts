import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class WalletResource implements Contracts.Api.Resource {
	public raw(resource: Models.Wallet): object {
		return resource;
	}

	public transform(resource: Models.Wallet): object {
		return resource;
	}
}
