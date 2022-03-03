import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { Action } from "../contracts";

@injectable()
export class DownloadPaused implements Action {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async handle(): Promise<void> {
		this.logger.info("Blockchain download paused");
	}
}
