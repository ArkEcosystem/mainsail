import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container } from "@arkecosystem/core-kernel";

import { Action } from "../contracts";

@Container.injectable()
export class DownloadPaused implements Action {
	@Container.inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async handle(): Promise<void> {
		this.logger.info("Blockchain download paused");
	}
}
