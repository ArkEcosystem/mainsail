import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

import { Resource } from "../types";

@injectable()
export class WalletResource implements Resource {
	public raw(resource: Models.Wallet): object {
		return resource;
	}

	public transform(resource: Models.Wallet): object {
		return resource;
	}
}
