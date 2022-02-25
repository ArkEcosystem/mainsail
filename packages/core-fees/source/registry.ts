import { Container } from "@arkecosystem/core-kernel";
import { get, set } from "@arkecosystem/utils";

@Container.injectable()
export class FeeRegistry {
	readonly #registry: Record<string, Record<number, number>> = {};

	public get(type: string, transaction: string, version: number): number {
		return get(this.#registry, `${type}.${transaction}.${version}`);
	}

	public set(type: string, transaction: string, version: number, fee: number): void {
		set(this.#registry, `${type}.${transaction}.${version}`, fee);
	}
}
