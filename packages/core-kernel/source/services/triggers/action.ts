import { injectable } from "@arkecosystem/core-container";

import { ActionArguments } from "../../types";

@injectable()
export abstract class Action<T = any> {
	readonly #hooks = {
		after: new Set<Function>(),
		before: new Set<Function>(),
		error: new Set<Function>(),
	};

	public before(function_: Function): this {
		this.#hooks.before.add(function_);

		return this;
	}

	public error(function_: Function): this {
		this.#hooks.error.add(function_);

		return this;
	}

	public after(function_: Function): this {
		this.#hooks.after.add(function_);

		return this;
	}

	public hooks(type: string): Set<Function> {
		return this.#hooks[type];
	}

	// As suggested in: https://stackoverflow.com/questions/54378992/overriding-a-generic-method-in-typescript

	public abstract execute<U>(arguments_: ActionArguments): Promise<U>;
	public abstract execute<T>(arguments_: ActionArguments): Promise<T>;
}
