import { Contracts } from "@mainsail/contracts";

export class AttributeRepository implements Contracts.State.IAttributeRepository {
	#attributes: Map<string, Contracts.State.AttributeType> = new Map();

	public set(name: string, type: Contracts.State.AttributeType): void {
		this.#attributes.set(name, type);
	}

	has(name: string): boolean {
		return this.#attributes.has(name);
	}

	getAttributeType<T>(name: string): Contracts.State.AttributeType {
		const attributeType = this.#attributes.get(name);

		if (!attributeType) {
			throw new Error(`Attribute "${name}" is not defined.`);
		}

		return attributeType;
	}
}
