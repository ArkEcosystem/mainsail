import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { InvalidArgumentException } from "@mainsail/exceptions";
import { assert } from "@mainsail/utils";

import { Action } from "./action.js";

@injectable()
export class Triggers {
	readonly #triggers: Map<string, Action<unknown>> = new Map<string, Action<unknown>>();

	public bind<T>(name: string, action: Action<T>): Action<T> {
		if (this.#triggers.has(name)) {
			throw new InvalidArgumentException(`The given trigger [${name}] is already registered.`);
		}

		if (this.#usesReservedBindingName(name)) {
			throw new InvalidArgumentException(`The given trigger [${name}] is reserved.`);
		}

		this.#triggers.set(name, action as Action<unknown>);

		return action;
	}

	public unbind<T>(name: string): Action<T> {
		const trigger = this.#triggers.get(name);

		if (!trigger) {
			throw new InvalidArgumentException(`The given trigger [${name}] is not available.`);
		}

		this.#triggers.delete(name);

		return trigger as Action<T>;
	}

	public rebind<T>(name: string, action: Action<T>): Action<T> {
		this.unbind(name);

		return this.bind(name, action);
	}

	public get<T>(name: string): Action<T> | undefined {
		this.#throwIfActionIsMissing(name);

		const trigger = this.#triggers.get(name);

		assert.defined(trigger);

		return trigger as Action<T>;
	}

	// TODO: Check implementation
	// TODO: Add in documentation: how errors are handled, which data can each hook type expect.

	public async call<T>(name: string, arguments_: Contracts.Kernel.ActionArguments = {}): Promise<T | undefined> {
		this.#throwIfActionIsMissing(name);

		let stage = "before";
		let result: T | undefined;
		try {
			await this.#callBeforeHooks(name, arguments_);

			stage = "execute";
			result = await this.get(name)!.execute<T>(arguments_);

			stage = "after";
			await this.#callAfterHooks<T>(name, arguments_, result);
		} catch (error) {
			// Handle errors inside error hooks. Rethrow error if there are no error hooks.
			if (this.get(name)!.hooks("error").size > 0) {
				await this.#callErrorHooks(name, arguments_, result, error, stage);
			} else {
				throw error;
			}
		}

		return result;
	}

	// @ts-ignore
	async #callBeforeHooks<T>(trigger: string, arguments_: TemplateTStringsArray): Promise<void> {
		const hooks = this.get(trigger)!.hooks("before");

		for (const hook of hooks) {
			await hook(arguments_);
		}
	}

	async #callAfterHooks<T>(trigger: string, arguments_: Contracts.Kernel.ActionArguments, result: T): Promise<void> {
		const hooks = this.get(trigger)!.hooks("after");

		for (const hook of hooks) {
			// @ts-ignore
			await hook(arguments_, result);
		}
	}

	async #callErrorHooks<T>(
		trigger: string,
		arguments_: Contracts.Kernel.ActionArguments,
		result: T | undefined,
		error: Error,
		stage: string,
	): Promise<void> {
		const hooks = this.get(trigger)!.hooks("error");

		for (const hook of hooks) {
			// @ts-ignore
			await hook(arguments_, result, error, stage);
		}
	}

	#throwIfActionIsMissing(name: string): void {
		if (!this.#triggers.has(name)) {
			throw new InvalidArgumentException(`The given trigger [${name}] is not available.`);
		}
	}

	#usesReservedBindingName(name: string): boolean {
		const prefixes: string[] = ["internal."];

		for (const prefix of prefixes) {
			if (name.startsWith(prefix)) {
				return true;
			}
		}

		return false;
	}
}
