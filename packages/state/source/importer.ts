import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { readdirSync } from "fs-extra";

@injectable()
export class Importer {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	async import(
		maxHeight: number,
		stateStore: Contracts.State.StateStore,
		walletRepository: Contracts.State.WalletRepository,
	): Promise<void> {
		// ...
		const fileName = await this.#findImportFile(maxHeight);
		if (!fileName) {
			this.logger.info("No state snapshot found to import");
			return;
		}

		this.logger.info(`Importing state snapshot: ${fileName}`);
	}

	async #findImportFile(maxHeigh: number): Promise<string | undefined> {
		const regexPattern = /^\d+\.zip$/;
		const heights = readdirSync(this.app.dataPath("state-export"))
			.filter((item) => regexPattern.test(item))
			.map((item) => +item.split(".")[0])
			.filter((item) => item <= maxHeigh)
			.sort((a, b) => b - a);

		if (heights.length > 0) {
			return `${heights[0]}.zip`;
		}
		return undefined;
	}
}
