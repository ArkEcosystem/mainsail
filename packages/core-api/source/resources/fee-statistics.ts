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
				avgFee: Number.parseInt(resource.avgFee, 10),
				maxFee: Number.parseInt(resource.maxFee, 10),
				minFee: Number.parseInt(resource.minFee, 10),
			},
			type: resource.type,
		};
	}
}
