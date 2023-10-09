import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { createWriteStream, ensureDirSync } from "fs-extra";
import { join } from "path";

@injectable()
export class Exporter {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public async export(
		stateStore: Contracts.State.StateStore,
		walletRepository: Contracts.State.WalletRepository,
	): Promise<void> {
		const heigh = stateStore.getLastHeight();

		ensureDirSync(this.app.dataPath("state-export"));
		const temporaryPath = this.app.tempPath(join("state-export", `${heigh}.zip`));
		const dataPath = this.app.dataPath(join("state-export", `${heigh}.zip`));

		console.log(`Exporting state at height ${heigh} at path: ${temporaryPath}, ${dataPath}`);

		await this.#export(temporaryPath, stateStore, walletRepository);
	}

	async #export(
		temporaryPath: string,
		stateStore: Contracts.State.StateStore,
		walletRepository: Contracts.State.WalletRepository,
	): Promise<void> {
		return new Promise(async (resolve) => {
			const writeStream = createWriteStream(temporaryPath);
			writeStream.write(`{"state": ${JSON.stringify(stateStore.toJson())}, "wallets": [\n`);

			let iteration = 0;
			for (const wallet of walletRepository.allByAddress()) {
				writeStream.write(JSON.stringify(wallet.toJson()));
				writeStream.write(",\n");

				if (iteration % 1000 === 0) {
					await new Promise((resolve) => setTimeout(resolve, 0));
				}
				iteration++;
			}

			writeStream.write(`]}`);
			writeStream.end();

			writeStream.on("finish", () => {
				resolve();
			});
		});
	}
}
