import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container } from "@arkecosystem/core-kernel";

import { Action } from "../contracts";

@Container.injectable()
export class ExitApp implements Action {
	@Container.inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	public async handle(): Promise<void> {
		this.app.terminate("Failed to startup blockchain. Exiting ARK Core!");
	}
}
