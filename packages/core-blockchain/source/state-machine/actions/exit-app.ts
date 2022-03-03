import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { Action } from "../contracts";

@injectable()
export class ExitApp implements Action {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	public async handle(): Promise<void> {
		this.app.terminate("Failed to startup blockchain. Exiting ARK Core!");
	}
}
