import Contracts from "@arkecosystem/core-contracts";

export const addressesIndexer = (index: Contracts.State.WalletIndex, wallet: Contracts.State.Wallet) => {
	if (wallet.getAddress()) {
		index.set(wallet.getAddress(), wallet);
	}
};

export const publicKeysIndexer = (index: Contracts.State.WalletIndex, wallet: Contracts.State.Wallet) => {
	if (wallet.getPublicKey()) {
		index.set(wallet.getPublicKey()!, wallet);
	}
};

export const usernamesIndexer = (index: Contracts.State.WalletIndex, wallet: Contracts.State.Wallet) => {
	if (wallet.isValidator()) {
		index.set(wallet.getAttribute("validator.username"), wallet);
	}
};

export const resignationsIndexer = (index: Contracts.State.WalletIndex, wallet: Contracts.State.Wallet) => {
	if (wallet.isValidator() && wallet.hasAttribute("validator.resigned")) {
		index.set(wallet.getAttribute("validator.username"), wallet);
	}
};
