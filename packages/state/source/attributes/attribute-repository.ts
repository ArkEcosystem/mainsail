import { AttributeType } from "./enums";

interface IAttributeRepository {
	add(name: string, type: AttributeType): void;
	has(name: string): boolean;
	getAttributeType<T>(name: string): AttributeType;
}

export class AttributeRepository implements IAttributeRepository {
	#attributes: Map<string, AttributeType> = new Map();

	public add(name: string, type: AttributeType): void {
		this.#attributes.set(name, type);
	}

	has(name: string): boolean {
		return this.#attributes.has(name);
	}

	getAttributeType<T>(name: string): AttributeType {
		const attributeType = this.#attributes.get(name);

		if (!attributeType) {
			throw new Error(`Attribute "${name}" is not defined.`);
		}

		return attributeType;
	}
}
