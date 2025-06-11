import { injectable } from "@mainsail/container";

import { Controller } from "./controller.js";

@injectable()
export class BlockchainController extends Controller {
	public async index() {
		const { data } = this.stateStore.getLastBlock();

		return {
			data: {
				block: {
					height: data.number,
					id: data.hash,
				},
			},
		};
	}
}
