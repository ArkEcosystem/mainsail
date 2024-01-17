import { CommitHandler } from "../crypto";
import { Store } from "./store";
import { WalletRepository } from "./wallets";

export interface Service extends CommitHandler {
	getStore(): Store;
	createStoreClone(): Store;
	getWalletRepository(): WalletRepository;
	createWalletRepositoryClone(): WalletRepository;
	createWalletRepositoryBySender(publicKey: string): Promise<WalletRepository>;
	restore(maxHeight: number): Promise<void>;
}
