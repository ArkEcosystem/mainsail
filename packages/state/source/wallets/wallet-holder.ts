import { Contracts } from "@mainsail/contracts";

export class WalletHolder implements Contracts.State.WalletHolder {
	#wallet: Contracts.State.Wallet;

	public constructor(wallet: Contracts.State.Wallet) {
		this.#wallet = wallet;
	}

	public getWallet(): Contracts.State.Wallet {
		return this.#wallet;
	}

	public setWallet(wallet: Contracts.State.Wallet): void {
		this.#wallet = wallet;
	}
}
