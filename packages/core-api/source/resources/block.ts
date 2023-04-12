import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

import { Resource } from "../interfaces";

@injectable()
export class BlockResource implements Resource {
	/**
	 * Return the raw representation of the resource.
	 *
	 * @param {*} resource
	 * @returns {object}
	 * @memberof Resource
	 */
	public raw(resource: Contracts.Crypto.IBlockData): object {
		return JSON.parse(JSON.stringify(resource));
	}

	/**
	 * Return the transformed representation of the resource.
	 *
	 * @param {*} resource
	 * @returns {object}
	 * @memberof Resource
	 */
	public transform(resource: Contracts.Crypto.IBlockData): object {
		throw new Error("Deprecated, use BlockWithTransactionsResources instead");
	}
}
