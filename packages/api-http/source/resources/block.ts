import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

import { Resource } from "../types";

@injectable()
export class BlockResource implements Resource {
	public raw(resource: Models.Block): object {
		return resource;
	}

	public transform(resource: Models.Block): object {
		throw new Error("Deprecated, use BlockWithTransactionsResources instead");
	}
}
