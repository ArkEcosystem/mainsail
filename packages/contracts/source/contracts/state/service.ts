import { ICommitHandler } from "../crypto";
import { StateStore } from "./state-store";
import { WalletRepository, WalletRepositoryClone } from "./wallets";

export interface Service extends ICommitHandler {
	getStateStore(): StateStore;
	getWalletRepository(): WalletRepository;
	createWalletRepositoryClone(): WalletRepositoryClone;
	createWalletRepositoryCopyOnWrite(): WalletRepository;
	restore(maxHeight: number): Promise<void>;
}
