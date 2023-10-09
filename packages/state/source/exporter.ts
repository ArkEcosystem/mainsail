import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class Exporter {
	public async export(
		stateStore: Contracts.State.StateStore,
		walletRepository: Contracts.State.WalletRepository,
	): Promise<void> {
		const heigh = stateStore.getLastHeight();

		console.log(`Exporting state at height ${heigh}...`);
	}
}
