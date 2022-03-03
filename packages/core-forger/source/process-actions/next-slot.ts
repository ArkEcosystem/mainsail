import { inject, injectable } from "@arkecosystem/core-container";
import Contracts, { Identifiers } from "@arkecosystem/core-contracts";

import { ForgerService } from "../forger-service";

@injectable()
export class NextSlotProcessAction implements Contracts.Kernel.ProcessAction {
	@inject(Identifiers.ForgerService)
	private readonly forger!: ForgerService;

	public name = "forger.nextSlot";

	public async handler() {
		return {
			remainingTime: this.forger.getRemainingSlotTime(),
		};
	}
}
