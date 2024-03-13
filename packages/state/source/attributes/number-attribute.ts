import { GenericAttribute } from "./generic-attribute.js";

export class NumberAttribute extends GenericAttribute<number> {
	public clone(): NumberAttribute {
		return new NumberAttribute(this.value);
	}

	public check(value: unknown): value is number {
		return typeof value === "number";
	}
}
