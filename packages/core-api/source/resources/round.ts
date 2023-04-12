import { injectable } from "@arkecosystem/core-container";
import { BigNumber } from "@arkecosystem/utils";

import { Resource } from "../interfaces";

@injectable()
export class RoundResource implements Resource {
	/**
	 * Return the raw representation of the resource.
	 *
	 * @param {*} resource
	 * @returns {object}
	 * @memberof Resource
	 */
	public raw(resource): object {
		return resource;
	}

	/**
	 * Return the transformed representation of the resource.
	 *
	 * @param {*} resource
	 * @returns {object}
	 * @memberof Resource
	 */
	public transform(resource): object {
		return {
			publicKey: resource.publicKey,
			votes: BigNumber.make(resource.balance).toFixed(),
		};
	}
}
