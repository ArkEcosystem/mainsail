import { Contracts } from "@mainsail/contracts";

import { describe } from "../../../test-framework";
import { WalletHolder } from "./wallet-holder";

describe("WalletHolder", ({ it, assert }) => {
	it("#getWallet - should return wallet from constructor", () => {
		const wallet = {} as Contracts.State.Wallet;

		const walletHolder = new WalletHolder(wallet);

		assert.true(walletHolder.getWallet() === wallet);
	});

	it("#setWallet - should set wallet", () => {
		const wallet = {} as Contracts.State.Wallet;

		const walletHolder = new WalletHolder({} as Contracts.State.Wallet);

		walletHolder.setWallet(wallet);

		assert.true(walletHolder.getWallet() === wallet);
	});
});
