import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber, get, set } from "@mainsail/utils";

@injectable()
export class FeeRegistry implements Contracts.Fee.IFeeRegistry {
	readonly #registry: Record<number, BigNumber> = {};

	public get(transaction: string, version: number): BigNumber {
		const value = get(this.#registry, `${transaction}.${version}`);
		Utils.assert.defined<BigNumber>(value);

		return value;
	}

	public set(transaction: string, version: number, fee: BigNumber): void {
		set(this.#registry, `${transaction}.${version}`, fee);
	}
}
