import { Contracts } from "@mainsail/contracts";

export class WalletIndex implements Contracts.State.WalletIndex {
	#walletByKey: Map<string, Contracts.State.WalletHolder>;
	#keysByWallet: Map<Contracts.State.WalletHolder, Set<string>>;

	public constructor(public readonly indexer: Contracts.State.WalletIndexer, public readonly autoIndex: boolean) {
		this.#walletByKey = new Map();
		this.#keysByWallet = new Map();
	}

	public entries(): ReadonlyArray<[string, Contracts.State.WalletHolder]> {
		return [...this.#walletByKey.entries()];
	}

	public keys(): string[] {
		return [...this.#walletByKey.keys()];
	}

	public walletKeys(walletHolder: Contracts.State.WalletHolder): string[] {
		const walletKeys = this.#keysByWallet.get(walletHolder);

		return walletKeys ? [...walletKeys.keys()] : [];
	}

	public values(): ReadonlyArray<Contracts.State.WalletHolder> {
		return [...this.#walletByKey.values()];
	}

	public index(walletHolder: Contracts.State.WalletHolder): void {
		this.indexer(this, walletHolder);
	}

	public has(key: string): boolean {
		return this.#walletByKey.has(key);
	}

	public get(key: string): Contracts.State.WalletHolder {
		return this.#walletByKey.get(key);
	}

	public set(key: string, walletHolder: Contracts.State.WalletHolder): void {
		const existingWallet = this.#walletByKey.get(key)!;

		// Remove given key in case where key points to different wallet
		if (existingWallet) {
			const existingKeys = this.#keysByWallet.get(existingWallet)!;
			existingKeys.delete(key);
		}

		this.#walletByKey.set(key, walletHolder);

		if (this.#keysByWallet.has(walletHolder)) {
			const existingKeys = this.#keysByWallet.get(walletHolder)!;
			existingKeys.add(key);
		} else {
			const keys: Set<string> = new Set();
			keys.add(key);

			this.#keysByWallet.set(walletHolder, keys);
		}
	}

	public forget(key: string): void {
		const wallet = this.#walletByKey.get(key)!;

		if (wallet) {
			const existingKeys = this.#keysByWallet.get(wallet)!;

			existingKeys.delete(key);

			this.#walletByKey.delete(key);
		}
	}

	public forgetWallet(wallet: Contracts.State.WalletHolder): void {
		const keys = this.#keysByWallet.get(wallet)!;

		if (keys) {
			for (const key of keys) {
				this.#walletByKey.delete(key);
			}

			this.#keysByWallet.delete(wallet);
		}
	}

	public clear(): void {
		this.#walletByKey = new Map();
		this.#keysByWallet = new Map();
	}
}
