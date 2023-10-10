import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

import { GenericAttribute } from "./generic-attribute";

export class BigNumberAttribute extends GenericAttribute<BigNumber> implements Contracts.State.IAttribute<BigNumber> {
	public clone(): BigNumberAttribute {
		return new BigNumberAttribute(new BigNumber(this.get()));
	}

	public check(value: unknown): value is BigNumber {
		return value instanceof BigNumber;
	}

	public toJson() {
		return this.value.toString();
	}

	public fromJson(value: Contracts.Types.JsonValue): Contracts.State.IAttribute<BigNumber> {
		if (typeof value !== "string") {
			throw new TypeError(`Value ${value} is not valid for attribute [${this.constructor.name}].`);
		}

		this.set(new BigNumber(value));
		return this;
	}
}
