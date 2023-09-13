import { GenericAttribute } from "./generic-attribute";

export class BooleanAttribute extends GenericAttribute<boolean> {
	public clone(): BooleanAttribute {
		return new BooleanAttribute(this.value);
	}
}
