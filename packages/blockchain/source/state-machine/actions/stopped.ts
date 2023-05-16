import { Contracts } from "@mainsail/contracts";

import { Action } from "../contracts";

@injectable()
export class Stopped implements Action {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async handle(): Promise<void> {
		this.logger.info("The blockchain has been stopped");
	}
}
