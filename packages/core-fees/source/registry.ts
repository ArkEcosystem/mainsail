import { injectable } from "@arkecosystem/core-container";
import { get, set } from "@arkecosystem/utils";

@injectable()
export class FeeRegistry {
	readonly #registry: Record<number, number> = {};

	public get(transaction: string, version: number): number {
		return get(this.#registry, `${transaction}.${version}`);
	}

	public set(transaction: string, version: number, fee: number): void {
		set(this.#registry, `${transaction}.${version}`, fee);
	}
}
