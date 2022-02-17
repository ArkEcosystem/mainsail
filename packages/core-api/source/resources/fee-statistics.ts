import { Container } from "@arkecosystem/core-kernel";

import { Resource } from "../interfaces";

@Container.injectable()
export class FeeStatisticsResource implements Resource {
	public raw(resource): object {
		return resource;
	}

	public transform(resource): object {
		return {
			type: resource.type,
			fees: {
				minFee: parseInt(resource.minFee, 10),
				maxFee: parseInt(resource.maxFee, 10),
				avgFee: parseInt(resource.avgFee, 10),
			},
		};
	}
}
