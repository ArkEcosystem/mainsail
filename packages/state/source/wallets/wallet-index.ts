import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

export class WalletIndex implements Contracts.State.WalletIndex {
	#walletByKey: Map<string, Contracts.State.Wallet>;

	public constructor() {
		this.#walletByKey = new Map();
	}

	public entries(): ReadonlyArray<[string, Contracts.State.Wallet]> {
		return [...this.#walletByKey.entries()];
	}

	public keys(): string[] {
		return [...this.#walletByKey.keys()];
	}

	public values(): ReadonlyArray<Contracts.State.Wallet> {
		return [...this.#walletByKey.values()];
	}

	public has(key: string): boolean {
		return this.#walletByKey.has(key);
	}

	public get(key: string): Contracts.State.Wallet {
		const walletHolder = this.#walletByKey.get(key);
		Utils.assert.defined<Contracts.State.Wallet>(walletHolder);

		return walletHolder;
	}

	public set(key: string, walletHolder: Contracts.State.Wallet): void {
		this.#walletByKey.set(key, walletHolder);
	}

	public forget(key: string): void {
		this.#walletByKey.delete(key);
	}

	public clear(): void {
		this.#walletByKey = new Map();
	}
}
