import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { factory } from "./attributes/index.js";

@injectable()
export class StateRepository implements Contracts.State.StateRepository {
	protected readonly attributes = new Map<string, Contracts.State.Attribute<unknown>>();

	protected attributeRepository!: Contracts.State.AttributeRepository;

	#originalRepository?: StateRepository;

	readonly #setAttributes = new Set<string>();
	readonly #forgetAttributes = new Set<string>();

	public configure(
		attributeRepository: Contracts.State.AttributeRepository,
		originalRepository?: StateRepository,
		initialData: Record<string, unknown> = {},
	): StateRepository {
		this.attributeRepository = attributeRepository;
		this.#originalRepository = originalRepository;

		for (const [key, value] of Object.entries(initialData)) {
			const attribute = factory(this.attributeRepository.getAttributeType(key), value);
			this.attributes.set(key, attribute);
		}

		return this;
	}

	public isClone(): boolean {
		return !!this.#originalRepository;
	}

	public isChanged(): boolean {
		return this.#setAttributes.size > 0 || this.#forgetAttributes.size > 0;
	}

	public hasAttribute(key: string): boolean {
		if (this.attributes.has(key)) {
			return true;
		}

		if (this.#originalRepository?.hasAttribute(key) && !this.#forgetAttributes.has(key)) {
			return this.#originalRepository.hasAttribute(key);
		}

		return false;
	}

	public getAttribute<T>(key: string, defaultValue?: T): T {
		if (this.hasAttribute(key)) {
			return this.getAttributeHolder<T>(key).get();
		}

		if (defaultValue !== undefined) {
			return defaultValue;
		}

		throw new Error(`Attribute "${key}" is not set.`);
	}

	public getAttributes(): Record<string, any> {
		const result = {};

		for (const name of this.attributeRepository.getAttributeNames()) {
			if (this.hasAttribute(name)) {
				result[name] = this.getAttribute(name);
			}
		}

		return result;
	}

	public setAttribute<T>(key: string, value: T): void {
		const attribute = this.attributes.get(key);

		if (!attribute) {
			this.attributes.set(key, factory(this.attributeRepository.getAttributeType(key), value));
		} else {
			attribute.set(value);
		}

		this.#setAttributes.add(key);
		this.#forgetAttributes.delete(key);
	}

	public forgetAttribute(key: string): boolean {
		if (!this.hasAttribute(key)) {
			return false;
		}

		const attribute = this.attributes.get(key);

		if (!attribute) {
			this.#checkAttributeName(key);
		}

		this.attributes.delete(key);
		this.#setAttributes.delete(key);
		this.#forgetAttributes.add(key);

		return !!attribute;
	}

	public commitChanges(): void {
		if (this.#originalRepository) {
			for (const attributeName of this.#forgetAttributes) {
				this.#originalRepository.forgetAttribute(attributeName);
			}

			for (const attributeName of this.#setAttributes) {
				this.#originalRepository.setAttribute(attributeName, this.attributes.get(attributeName)!.get());
			}
		}
	}

	protected getAttributeHolder<T>(key: string): Contracts.State.Attribute<T> {
		const attribute = this.attributes.get(key) as Contracts.State.Attribute<T>;

		if (attribute) {
			return attribute;
		}

		Utils.assert.defined<StateRepository>(this.#originalRepository);
		return this.#originalRepository?.getAttributeHolder<T>(key);
	}

	#checkAttributeName(name: string): void {
		if (!this.attributeRepository.has(name)) {
			throw new Error(`Attribute name "${name}" is not registered.`); // TODO: Custom errors
		}
	}
}
