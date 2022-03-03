import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";
import { injectable, inject } from "@arkecosystem/core-container";

import { ForgerService } from "../forger-service";

@injectable()
export class CurrentValidatorProcessAction implements Contracts.Kernel.ProcessAction {
	@inject(Identifiers.ForgerService)
	private readonly forger!: ForgerService;

	public name = "forger.currentValidator";

	public async handler() {
		const round = this.forger.getRound();

		Utils.assert.defined(round);

		return {
			// @ts-ignore
			rank: round.currentForger.validator.rank,
			// @ts-ignore
			username: round.currentForger.validator.username,
		};
	}
}
