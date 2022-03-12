import { injectable } from "@arkecosystem/core-container";

import { ActionArguments } from "../../types";

@injectable()
export abstract class Action<T = any> {
	readonly #beforeHooks: Set<Function> = new Set<Function>();

	readonly #errorHooks: Set<Function> = new Set<Function>();

	readonly #afterHooks: Set<Function> = new Set<Function>();

	public before(function_: Function): this {
		this.#beforeHooks.add(function_);

		return this;
	}

	public error(function_: Function): this {
		this.#errorHooks.add(function_);

		return this;
	}

	public after(function_: Function): this {
		this.#afterHooks.add(function_);

		return this;
	}

	public hooks(type: string): Set<Function> {
		return this[`${type}Hooks`];
	}

	// As suggested in: https://stackoverflow.com/questions/54378992/overriding-a-generic-method-in-typescript

	public abstract execute<U>(arguments_: ActionArguments): Promise<U>;
	public abstract execute<T>(arguments_: ActionArguments): Promise<T>;
}
