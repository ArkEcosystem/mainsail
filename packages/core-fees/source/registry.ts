import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { BigNumber, get, set } from "@arkecosystem/utils";

@injectable()
export class FeeRegistry implements Contracts.Fee.IFeeRegistry {
	readonly #registry: Record<number, BigNumber> = {};

	public get(transaction: string, version: number): BigNumber {
		return get(this.#registry, `${transaction}.${version}`);
	}

	public set(transaction: string, version: number, fee: BigNumber): void {
		set(this.#registry, `${transaction}.${version}`, fee);
	}
}
