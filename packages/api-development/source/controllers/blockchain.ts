// import { Utils } from "@mainsail/kernel";

import { Controller } from "./controller";

export class BlockchainController extends Controller {
	public async index() {
		const { data } = this.stateService.getStateStore().getLastBlock();

		return {
			data: {
				block: {
					height: data.height,
					id: data.id,
				},
				// supply: Utils.supplyCalculator.calculate(data.height), // TODO: Enable supply calculator
			},
		};
	}
}
