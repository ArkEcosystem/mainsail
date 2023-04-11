import { injectable } from "@arkecosystem/core-container";

import { Resource } from "../interfaces";

@injectable()
export class FeeStatisticsResource implements Resource {
	public raw(resource): object {
		return resource;
	}

	public transform(resource): object {
		return {
			fees: {
				avgFee: parseInt(resource.avgFee, 10),
				maxFee: parseInt(resource.maxFee, 10),
				minFee: parseInt(resource.minFee, 10),
			},
			type: resource.type,
		};
	}
}
