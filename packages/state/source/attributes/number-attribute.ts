import { GenericAttribute } from "./generic-attribute";

export class NumberAttribute extends GenericAttribute<number> {
	public clone(): NumberAttribute {
		return new NumberAttribute(this.value);
	}
}
