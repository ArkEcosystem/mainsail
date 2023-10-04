import { StateStore } from "./state-store";
import { WalletRepository, WalletRepositoryClone } from "./wallets";

export interface Service {
	getStateStore(): StateStore;
	getWalletRepository(): WalletRepository;
	createWalletRepositoryClone(): WalletRepositoryClone;
}
