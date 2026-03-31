import type { Types } from "@mainsail/api-common";
import { injectable } from "@mainsail/container";

import { Controller } from "./controller.js";

@injectable()
export class BlockchainController extends Controller {
	public async index(request: Types.HapiRequest): Promise<object> {
		const block = this.stateStore.getLastBlock();

		return {
			data: {
				block: {
					hash: block.hash,
					height: block.number,
				},
			},
		};
	}
}
