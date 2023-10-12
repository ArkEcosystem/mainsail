import { StateStore } from "./state-store";
import { WalletRepository } from "./wallets";

export interface Exporter {
	export(stateStore: StateStore, walletRepository: WalletRepository): Promise<void>;
}

export interface Importer {
	import(maxHeight: number, stateStore: StateStore, walletRepository: WalletRepository): Promise<void>;
}
