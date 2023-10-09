import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
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

		const temporaryPath = this.app.tempPath(join("state-export", `${heigh}.zip`));
		const dataPath = this.app.dataPath(join("state-export", `${heigh}.zip`));

		console.log(`Exporting state at height ${heigh} at path: ${temporaryPath}, ${dataPath}`);
	}
}
