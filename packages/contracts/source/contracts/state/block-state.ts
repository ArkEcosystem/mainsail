import { Block } from "../crypto/index.js";
import { WalletRepository } from "./wallets.js";

export interface BlockState {
	applyBlock(walletRepository: WalletRepository, block: Block): Promise<void>;
}
