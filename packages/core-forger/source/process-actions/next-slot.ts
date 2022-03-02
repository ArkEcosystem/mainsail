import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container } from "@arkecosystem/core-kernel";

import { ForgerService } from "../forger-service";

@Container.injectable()
export class NextSlotProcessAction implements Contracts.Kernel.ProcessAction {
	@Container.inject(Identifiers.ForgerService)
	private readonly forger!: ForgerService;

	public name = "forger.nextSlot";

	public async handler() {
		return {
			remainingTime: this.forger.getRemainingSlotTime(),
		};
	}
}
