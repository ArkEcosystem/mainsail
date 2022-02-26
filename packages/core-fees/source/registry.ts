import { Container } from "@arkecosystem/core-kernel";
import { get, set } from "@arkecosystem/utils";

@Container.injectable()
export class FeeRegistry {
	readonly #registry: Record<number, number> = {};

	public get(transaction: string, version: number): number {
		return get(this.#registry, `${transaction}.${version}`);
	}

	public set(transaction: string, version: number, fee: number): void {
		set(this.#registry, `${transaction}.${version}`, fee);
	}
}
