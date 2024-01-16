import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { factory, jsonFactory } from "./attributes";

export class Repository {
	protected readonly attributes = new Map<string, Contracts.State.IAttribute<unknown>>();

	readonly #originalRepository?: Repository;
	readonly #setAttributes = new Set<string>();
	readonly #forgetAttributes = new Set<string>();

	public constructor(
		protected readonly attributeRepository: Contracts.State.IAttributeRepository,
		readonly originalRepository?: Repository,
	) {
		this.attributeRepository = attributeRepository;
		this.#originalRepository = originalRepository;
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
		Utils.assert.defined<Repository>(this.#originalRepository);

		for (const attributeName of this.#forgetAttributes) {
			this.#originalRepository.forgetAttribute(attributeName);
		}

		for (const attributeName of this.#setAttributes) {
			this.#originalRepository.setAttribute(attributeName, this.attributes.get(attributeName)!.get());
		}
	}

	public toJson(): Contracts.Types.JsonObject {
		const result = {};

		for (const name of this.attributeRepository.getAttributeNames()) {
			if (this.hasAttribute(name)) {
				result[name] = this.getAttributeHolder(name).toJson();
			}
		}

		return result;
	}

	public fromJson(data: Contracts.Types.JsonObject): void {
		if (this.isChanged()) {
			throw new Error("Cannot restore to a changed repository.");
		}

		for (const [key, value] of Object.entries(data)) {
			Utils.assert.defined<Contracts.Types.JsonValue>(value);

			const attribute = jsonFactory(this.attributeRepository.getAttributeType(key), value);
			this.attributes.set(key, attribute);
		}
	}

	protected getAttributeHolder<T>(key: string): Contracts.State.IAttribute<T> {
		const attribute = this.attributes.get(key) as Contracts.State.IAttribute<T>;

		if (attribute) {
			return attribute;
		}

		Utils.assert.defined<Repository>(this.#originalRepository);
		return this.#originalRepository?.getAttributeHolder<T>(key);
	}

	#checkAttributeName(name: string): void {
		if (!this.attributeRepository.has(name)) {
			throw new Error(`Attribute name "${name}" is not registered.`); // TODO: Custom errors
		}
	}
}
