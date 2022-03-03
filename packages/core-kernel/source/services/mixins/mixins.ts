import { injectable } from "@arkecosystem/core-container";

import { Constructor } from "../../types/container";
import { assert } from "../../utils";

@injectable()
export class MixinService {
	private readonly mixins: Map<string, Function> = new Map<string, Function>();

	public get(name: string): Function {
		const mixin: Function | undefined = this.mixins.get(name);

		assert.defined<Function>(mixin);

		return mixin;
	}

	public set(name: string, macro: Function) {
		this.mixins.set(name, macro);
	}

	public forget(name: string): boolean {
		return this.mixins.delete(name);
	}

	public has(name: string): boolean {
		return this.mixins.has(name);
	}

	public apply<T>(names: string | string[], value: Constructor): Constructor<T> {
		if (!Array.isArray(names)) {
			names = [names];
		}

		let macroValue: Constructor<T> = this.get(names[0])(value);

		names.shift();

		for (const name of names) {
			macroValue = this.get(name)(macroValue);
		}

		return macroValue;
	}
}
