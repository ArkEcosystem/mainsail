import { Store } from "./store";
import { WalletRepository } from "./wallets";

export interface Exporter {
	export(store: Store, walletRepository: WalletRepository): Promise<void>;
}

export interface Importer {
	import(maxHeight: number, store: Store, walletRepository: WalletRepository): Promise<void>;
}
