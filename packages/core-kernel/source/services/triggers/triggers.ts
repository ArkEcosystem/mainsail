import { injectable } from "@arkecosystem/core-container";

import { Exceptions } from "@arkecosystem/core-contracts";
import { ActionArguments } from "../../types";
import { assert } from "../../utils";
import { Action } from "./action";

@injectable()
export class Triggers {
	private readonly triggers: Map<string, Action> = new Map<string, Action>();

	public bind(name: string, action: Action): Action {
		if (this.triggers.has(name)) {
			throw new Exceptions.InvalidArgumentException(`The given trigger [${name}] is already registered.`);
		}

		if (this.usesReservedBindingName(name)) {
			throw new Exceptions.InvalidArgumentException(`The given trigger [${name}] is reserved.`);
		}

		this.triggers.set(name, action);

		return action;
	}

	public unbind(name: string): Action {
		const trigger = this.triggers.get(name);

		if (!trigger) {
			throw new Exceptions.InvalidArgumentException(`The given trigger [${name}] is not available.`);
		}

		this.triggers.delete(name);

		return trigger;
	}

	public rebind(name: string, action: Action): Action {
		this.unbind(name);

		return this.bind(name, action);
	}

	public get(name: string): Action {
		this.throwIfActionIsMissing(name);

		const trigger: Action | undefined = this.triggers.get(name);

		assert.defined<Action>(trigger);

		return trigger;
	}

	// TODO: Check implementation
	// TODO: Add in documentation: how errors are handled, which data can each hook type expect.

	public async call<T>(name: string, arguments_: ActionArguments = {}): Promise<T | undefined> {
		this.throwIfActionIsMissing(name);

		let stage = "before";
		let result: T | undefined;
		try {
			await this.callBeforeHooks(name, arguments_);

			stage = "execute";
			result = await this.get(name).execute<T>(arguments_);

			stage = "after";
			await this.callAfterHooks<T>(name, arguments_, result);
		} catch (error) {
			// Handle errors inside error hooks. Rethrow error if there are no error hooks.
			if (this.get(name).hooks("error").size > 0) {
				await this.callErrorHooks(name, arguments_, result, error, stage);
			} else {
				throw error;
			}
		}

		return result;
	}

	private async callBeforeHooks<T>(trigger: string, arguments_: ActionArguments): Promise<void> {
		const hooks: Set<Function> = this.get(trigger).hooks("before");

		for (const hook of hooks) {
			await hook(arguments_);
		}
	}

	private async callAfterHooks<T>(trigger: string, arguments_: ActionArguments, result: T): Promise<void> {
		const hooks: Set<Function> = this.get(trigger).hooks("after");

		for (const hook of hooks) {
			await hook(arguments_, result);
		}
	}

	private async callErrorHooks<T>(
		trigger: string,
		arguments_: ActionArguments,
		result: T | undefined,
		error: Error,
		stage: string,
	): Promise<void> {
		const hooks: Set<Function> = this.get(trigger).hooks("error");

		for (const hook of hooks) {
			await hook(arguments_, result, error, stage);
		}
	}

	private throwIfActionIsMissing(name: string): void {
		if (!this.triggers.has(name)) {
			throw new Exceptions.InvalidArgumentException(`The given trigger [${name}] is not available.`);
		}
	}

	private usesReservedBindingName(name: string): boolean {
		const prefixes: string[] = ["internal."];

		for (const prefix of prefixes) {
			if (name.startsWith(prefix)) {
				return true;
			}
		}

		return false;
	}
}
