import { strictEqual } from "assert";

import { Factory } from "./factory.js";
import type { FactoryFunction } from "./types.js";

export class FactoryBuilder {
	readonly #factories: Map<string, Factory<unknown>> = new Map<string, Factory<unknown>>();

	public get<T>(factory: string): Factory<T> {
		strictEqual(this.#factories.has(factory), true, `The [${factory}] factory is unknown.`);

		return this.#factories.get(factory)! as Factory<T>;
	}

	public set(factory: string, function_: FactoryFunction): boolean {
		const instance: Factory<unknown> = new Factory();
		instance.state("default", function_);

		this.#factories.set(factory, instance);

		return this.#factories.has(factory);
	}
}
