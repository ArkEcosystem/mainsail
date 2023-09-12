import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

export class BigNumberAttribute implements Contracts.State.IAttribute<BigNumber> {
	#changed = false;
	#value: BigNumber;

	constructor(value: BigNumber) {
		this.#value = value;
	}

	public isChanged(): boolean {
		return this.#changed;
	}

	public get(): BigNumber {
		return this.#value;
	}

	public set(value: BigNumber): void {
		this.#value = value;
		this.#changed = true;
	}

	public clone(): BigNumberAttribute {
		return new BigNumberAttribute(new BigNumber(this.#value));
	}
}
