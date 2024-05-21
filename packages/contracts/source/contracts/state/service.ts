import { CommitHandler } from "../crypto/commit.js";
import { Store } from "./store.js";
import { WalletRepository } from "./wallets.js";

export interface Service extends CommitHandler {
	getStore(): Store;
	createStoreClone(): Store;
	createWalletRepositoryBySender(publicKey: string): Promise<WalletRepository>;
	export(height: number): Promise<void>;
	restore(maxHeight: number): Promise<void>;
}
