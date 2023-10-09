import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { copyFile, createWriteStream, ensureDirSync } from "fs-extra";
import { join } from "path";

@injectable()
export class Exporter {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async export(
		stateStore: Contracts.State.StateStore,
		walletRepository: Contracts.State.WalletRepository,
	): Promise<void> {
		const heigh = stateStore.getLastHeight();

		ensureDirSync(this.app.tempPath("state-export"));
		const temporaryPath = this.app.tempPath(join("state-export", `${heigh}.zip`));

		this.logger.info(`Exporting state at height ${heigh}...`);

		await this.#export(temporaryPath, stateStore, walletRepository);

		ensureDirSync(this.app.dataPath("state-export"));
		await copyFile(temporaryPath, this.app.dataPath(join("state-export", `${heigh}.zip`)));
	}

	async #export(
		temporaryPath: string,
		stateStore: Contracts.State.StateStore,
		walletRepository: Contracts.State.WalletRepository,
	): Promise<void> {
		return new Promise(async (resolve) => {
			const writeStream = createWriteStream(temporaryPath);
			writeStream.write(`${JSON.stringify(stateStore.toJson())}\n`);

			let iteration = 0;
			for (const wallet of walletRepository.allByAddress()) {
				writeStream.write(`${JSON.stringify(wallet.toJson())}\n`);

				if (iteration % 1000 === 0) {
					await new Promise((resolve) => setTimeout(resolve, 0));
				}
				iteration++;
			}

			writeStream.end();

			writeStream.on("finish", () => {
				resolve();
			});

			// TODO: Handle stream errors
		});
	}
}
