import { Container } from "@arkecosystem/core-kernel";
import { BigNumber, get, set } from "@arkecosystem/utils";

@Container.injectable()
export class FeeRegistry {
	readonly #registry: Record<string, Record<number, BigNumber>> = {};

	public get(type: string, transaction: number, version: number): BigNumber {
		return get(this.#registry, `${type}.${transaction}.${version}`);
	}

	public set(type: string, transaction: string, version: number, fee: BigNumber): void {
		set(this.#registry, `${type}.${transaction}.${version}`, fee);
	}
}
