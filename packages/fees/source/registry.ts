import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber, get, set } from "@mainsail/utils";

@injectable()
export class FeeRegistry implements Contracts.Fee.FeeRegistry {
	// Set to `undefined` so that calling `get` will hit the assert when a fee has not been
	// initialized properly. Relevant when using e.g. static fees.
	private static readonly UNSPECIFIED_FEE: BigNumber = undefined as unknown as BigNumber;

	readonly #registry: Record<number, BigNumber> = {};

	public get(transaction: string, version = 1): BigNumber {
		const value = get(this.#registry, `${transaction}.${version}`);
		Utils.assert.defined<BigNumber>(value);

		return value;
	}

	public set(transaction: string, fee = FeeRegistry.UNSPECIFIED_FEE, version = 1): void {
		set(this.#registry, `${transaction}.${version}`, fee);
	}
}
