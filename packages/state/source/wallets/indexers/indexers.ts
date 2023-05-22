import { Contracts } from "@mainsail/contracts";

export const addressesIndexer = (index: Contracts.State.WalletIndex, walletHolder: Contracts.State.WalletHolder) => {
	if (walletHolder.getWallet().getAddress()) {
		index.set(walletHolder.getWallet().getAddress(), walletHolder);
	}
};

export const publicKeysIndexer = (index: Contracts.State.WalletIndex, wallet: Contracts.State.WalletHolder) => {
	if (wallet.getWallet().getPublicKey()) {
		index.set(wallet.getWallet().getPublicKey()!, wallet);
	}
};

export const usernamesIndexer = (index: Contracts.State.WalletIndex, wallet: Contracts.State.WalletHolder) => {
	if (wallet.getWallet().isValidator()) {
		index.set(wallet.getWallet().getAttribute("validator.username"), wallet);
	}
};

export const resignationsIndexer = (index: Contracts.State.WalletIndex, wallet: Contracts.State.WalletHolder) => {
	if (wallet.getWallet().isValidator() && wallet.getWallet().hasAttribute("validator.resigned")) {
		index.set(wallet.getWallet().getAttribute("validator.username"), wallet);
	}
};
