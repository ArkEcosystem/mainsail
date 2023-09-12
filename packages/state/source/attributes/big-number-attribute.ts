import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

import { GenericAttribute } from "./generic-attribute";

export class BigNumberAttribute extends GenericAttribute<BigNumber> implements Contracts.State.IAttribute<BigNumber> {
	public clone(): BigNumberAttribute {
		return new BigNumberAttribute(new BigNumber(this.get()));
	}
}
