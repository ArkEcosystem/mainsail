import { GenericAttribute } from "./generic-attribute.js";

export class StringAttribute extends GenericAttribute<string> {
	public clone(): StringAttribute {
		return new StringAttribute(this.value);
	}

	public check(value: unknown): value is string {
		return typeof value === "string";
	}
}
