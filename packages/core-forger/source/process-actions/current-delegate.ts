import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container, Utils } from "@arkecosystem/core-kernel";

import { ForgerService } from "../forger-service";

@Container.injectable()
export class CurrentDelegateProcessAction implements Contracts.Kernel.ProcessAction {
	@Container.inject(Identifiers.ForgerService)
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
