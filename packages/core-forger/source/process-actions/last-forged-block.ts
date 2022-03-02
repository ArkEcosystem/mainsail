import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container, Utils } from "@arkecosystem/core-kernel";

import { ForgerService } from "../forger-service";

@Container.injectable()
export class LastForgedBlockRemoteAction implements Contracts.Kernel.ProcessAction {
	@Container.inject(Identifiers.ForgerService)
	private readonly forger!: ForgerService;

	public name = "forger.lastForgedBlock";

	public async handler() {
		const lastForgedBlock = this.forger.getLastForgedBlock();

		Utils.assert.defined(lastForgedBlock);

		// @ts-ignore
		return lastForgedBlock.data;
	}
}
