import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";
import { injectable, inject } from "@arkecosystem/core-container";

import { ForgerService } from "../forger-service";

@injectable()
export class CurrentDelegateProcessAction implements Contracts.Kernel.ProcessAction {
	@inject(Identifiers.ForgerService)
	private readonly forger!: ForgerService;

	public name = "forger.currentDelegate";

	public async handler() {
		const round = this.forger.getRound();

		Utils.assert.defined(round);

		return {
			// @ts-ignore
			rank: round.currentForger.delegate.rank,
			// @ts-ignore
			username: round.currentForger.delegate.username,
		};
	}
}
