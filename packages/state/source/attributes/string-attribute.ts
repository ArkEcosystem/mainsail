import { GenericAttribute } from "./generic-attribute";

export class StringAttribute extends GenericAttribute<string> {
	public clone(): StringAttribute {
		return new StringAttribute(this.value);
	}
}
