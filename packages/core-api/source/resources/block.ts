import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

import { Resource } from "../types";

@injectable()
export class BlockResource implements Resource {
	public raw(resource: Contracts.Crypto.IBlockData): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public transform(resource: Contracts.Crypto.IBlockData): object {
		throw new Error("Deprecated, use BlockWithTransactionsResources instead");
	}
}
