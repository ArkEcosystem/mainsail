import { injectable } from "@mainsail/container";

import { ActionArguments } from "../../types/index.js";

type ActionFunction<T> = (arguments_: T) => T;

@injectable()
export abstract class Action<T = any> {
	readonly #hooks = {
		after: new Set<ActionFunction<T>>(),
		before: new Set<ActionFunction<T>>(),
		error: new Set<ActionFunction<T>>(),
	};

	public before(function_: ActionFunction<T>): this {
		this.#hooks.before.add(function_);

		return this;
	}

	public error(function_: ActionFunction<T>): this {
		this.#hooks.error.add(function_);

		return this;
	}

	public after(function_: ActionFunction<T>): this {
		this.#hooks.after.add(function_);

		return this;
	}

	public hooks(type: string): Set<ActionFunction<T>> {
		return this.#hooks[type];
	}

	// As suggested in: https://stackoverflow.com/questions/54378992/overriding-a-generic-method-in-typescript

	public abstract execute<U>(arguments_: ActionArguments): Promise<U>;
	public abstract execute<T>(arguments_: ActionArguments): Promise<T>;
}
