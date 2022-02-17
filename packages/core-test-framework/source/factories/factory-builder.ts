import { strictEqual } from "assert";

import { Factory } from "./factory";
import { FactoryFunction } from "./types";

export class FactoryBuilder {
	private readonly factories: Map<string, Factory> = new Map<string, Factory>();

	public get(factory: string): Factory {
		strictEqual(this.factories.has(factory), true, `The [${factory}] factory is unknown.`);

		return this.factories.get(factory) as Factory;
	}

	public set(factory: string, fn: FactoryFunction): boolean {
		const instance: Factory = new Factory();
		instance.state("default", fn);

		this.factories.set(factory, instance);

		return this.factories.has(factory);
	}
}
