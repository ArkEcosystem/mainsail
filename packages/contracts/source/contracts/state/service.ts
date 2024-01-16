import { CommitHandler } from "../crypto";
import { Store } from "./store";
import { WalletRepository, WalletRepositoryClone } from "./wallets";

export interface Service extends CommitHandler {
	getStore(): Store;
	getWalletRepository(): WalletRepository;
	createWalletRepositoryClone(): WalletRepositoryClone;
	createWalletRepositoryBySender(publicKey: string): Promise<WalletRepository>;
	restore(maxHeight: number): Promise<void>;
}
