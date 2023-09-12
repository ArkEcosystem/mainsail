import { Contracts } from "@mainsail/contracts";
import { cloneDeep } from "@mainsail/utils";

import { GenericAttribute } from "./generic-attribute";

export class ObjectAttribute extends GenericAttribute<object> implements Contracts.State.IAttribute<object> {
	public clone(): ObjectAttribute {
		return new ObjectAttribute(cloneDeep(this.get()));
	}
}
