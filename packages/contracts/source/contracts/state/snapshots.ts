import { Repository } from "./repository";
import { Store } from "./store";
import { WalletRepository } from "./wallets";

export interface Exporter {
	export(height: number, state: Repository, walletRepository: WalletRepository): Promise<void>;
}

export interface Importer {
	import(maxHeight: number, store: Store): Promise<void>;
}
