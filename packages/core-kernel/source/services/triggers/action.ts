import { ActionArguments } from "../../types";

export abstract class Action<T = any> {
	private readonly beforeHooks: Set<Function> = new Set<Function>();

	private readonly errorHooks: Set<Function> = new Set<Function>();

	private readonly afterHooks: Set<Function> = new Set<Function>();

	public before(fn: Function): this {
		this.beforeHooks.add(fn);

		return this;
	}

	public error(fn: Function): this {
		this.errorHooks.add(fn);

		return this;
	}

	public after(fn: Function): this {
		this.afterHooks.add(fn);

		return this;
	}

	public hooks(type: string): Set<Function> {
		return this[`${type}Hooks`];
	}

	// As suggested in: https://stackoverflow.com/questions/54378992/overriding-a-generic-method-in-typescript

	public abstract execute<U>(args: ActionArguments): Promise<U>;
	public abstract execute<T>(args: ActionArguments): Promise<T>;
}
