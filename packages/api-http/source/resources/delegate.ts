import { Contracts } from "@mainsail/api-common";
import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

@injectable()
export class DelegateResource implements Contracts.Resource {
	public raw(resource: Models.Wallet): object {
		return resource;
	}

	public transform(resource: Models.Wallet): object {
		return resource;
	}
}
