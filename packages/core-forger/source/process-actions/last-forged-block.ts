import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";
import { injectable, inject } from "@arkecosystem/core-container";

import { ForgerService } from "../forger-service";

@injectable()
export class LastForgedBlockRemoteAction implements Contracts.Kernel.ProcessAction {
	@inject(Identifiers.ForgerService)
	private readonly forger!: ForgerService;

	public name = "forger.lastForgedBlock";

	public async handler() {
		const lastForgedBlock = this.forger.getLastForgedBlock();

		Utils.assert.defined(lastForgedBlock);

		// @ts-ignore
		return lastForgedBlock.data;
	}
}
