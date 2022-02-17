import { InvalidArgumentException } from "../../exceptions/logic";
import { injectable } from "../../ioc";
import { ActionArguments } from "../../types";
import { assert } from "../../utils";
import { Action } from "./action";

@injectable()
export class Triggers {
	private readonly triggers: Map<string, Action> = new Map<string, Action>();

	public bind(name: string, action: Action): Action {
		if (this.triggers.has(name)) {
			throw new InvalidArgumentException(`The given trigger [${name}] is already registered.`);
		}

		if (this.usesReservedBindingName(name)) {
			throw new InvalidArgumentException(`The given trigger [${name}] is reserved.`);
		}

		this.triggers.set(name, action);

		return action;
	}

	public unbind(name: string): Action {
		const trigger = this.triggers.get(name);

		if (!trigger) {
			throw new InvalidArgumentException(`The given trigger [${name}] is not available.`);
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

	public async call<T>(name: string, args: ActionArguments = {}): Promise<T | undefined> {
		this.throwIfActionIsMissing(name);

		let stage: string = "before";
		let result: T | undefined;
		try {
			await this.callBeforeHooks(name, args);

			stage = "execute";
			result = await this.get(name).execute<T>(args);

			stage = "after";
			await this.callAfterHooks<T>(name, args, result);
		} catch (err) {
			// Handle errors inside error hooks. Rethrow error if there are no error hooks.
			if (this.get(name).hooks("error").size) {
				await this.callErrorHooks(name, args, result, err, stage);
			} else {
				throw err;
			}
		}

		return result;
	}

	private async callBeforeHooks<T>(trigger: string, args: ActionArguments): Promise<void> {
		const hooks: Set<Function> = this.get(trigger).hooks("before");

		for (const hook of [...hooks]) {
			await hook(args);
		}
	}

	private async callAfterHooks<T>(trigger: string, args: ActionArguments, result: T): Promise<void> {
		const hooks: Set<Function> = this.get(trigger).hooks("after");

		for (const hook of [...hooks]) {
			await hook(args, result);
		}
	}

	private async callErrorHooks<T>(
		trigger: string,
		args: ActionArguments,
		result: T | undefined,
		err: Error,
		stage: string,
	): Promise<void> {
		const hooks: Set<Function> = this.get(trigger).hooks("error");

		for (const hook of [...hooks]) {
			await hook(args, result, err, stage);
		}
	}

	private throwIfActionIsMissing(name: string): void {
		if (!this.triggers.has(name)) {
			throw new InvalidArgumentException(`The given trigger [${name}] is not available.`);
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
