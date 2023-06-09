import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Action } from "../contracts";

@injectable()
export class ExitApp implements Action {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	public async handle(): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.app.terminate("Failed to startup blockchain. Exiting Mainsail!");
	}
}
