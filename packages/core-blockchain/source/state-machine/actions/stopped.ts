import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container } from "@arkecosystem/core-kernel";

import { Action } from "../contracts";

@Container.injectable()
export class Stopped implements Action {
	@Container.inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@Container.inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async handle(): Promise<void> {
		this.logger.info("The blockchain has been stopped");
	}
}
