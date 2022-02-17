import { Container, Contracts, Utils } from "@arkecosystem/core-kernel";

import { ForgerService } from "../forger-service";

@Container.injectable()
export class CurrentDelegateProcessAction implements Contracts.Kernel.ProcessAction {
	@Container.inject(Container.Identifiers.ForgerService)
	private readonly forger!: ForgerService;

	public name = "forger.currentDelegate";

	public async handler() {
		const round = this.forger.getRound();

		Utils.assert.defined(round);

		return {
			rank: round.currentForger.delegate.rank,
			username: round.currentForger.delegate.username,
		};
	}
}
