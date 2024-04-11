import { GenericAttribute } from "./generic-attribute.js";

export class BooleanAttribute extends GenericAttribute<boolean> {
	public clone(): BooleanAttribute {
		return new BooleanAttribute(this.value);
	}

	public check(value: unknown): value is boolean {
		return typeof value === "boolean";
	}
}
