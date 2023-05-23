import { Contracts } from "@mainsail/contracts";

export class WalletHolder implements Contracts.State.WalletHolder {
	#wallet: Contracts.State.Wallet;
	#original: WalletHolder | undefined;

	public constructor(wallet: Contracts.State.Wallet) {
		this.#wallet = wallet;
	}

	public getWallet(): Contracts.State.Wallet {
		return this.#wallet;
	}

	public setWallet(wallet: Contracts.State.Wallet): void {
		this.#wallet = wallet;
	}

	public getOriginal(): WalletHolder | undefined {
		return this.#original;
	}

	public clone(): WalletHolder {
		const walletHolder = new WalletHolder(this.#wallet.clone());
		walletHolder.#original = this;
		return walletHolder;
	}
}
