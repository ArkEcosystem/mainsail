import { Utils } from "@arkecosystem/core-kernel";
import { strictEqual } from "assert";

import { FactoryFunction, FactoryFunctionOptions, HookFunction } from "./types";

export class Factory {
	readonly #states: Map<string, FactoryFunction> = new Map<string, FactoryFunction>();

	readonly #hooks: Map<string, Set<HookFunction>> = new Map<string, Set<HookFunction>>();

	readonly #modifiers: {
		states: Set<string>;
		attributes: object;
		options: FactoryFunctionOptions;
	} = {
		attributes: {},
		options: {},
		states: new Set<string>(["default"]),
	};

	public state(state: string, function_: FactoryFunction): boolean {
		this.#states.set(state, function_);

		return this.#states.has(state);
	}

	public afterMaking(function_: HookFunction): void {
		this.afterMakingState("default", function_);
	}

	public afterMakingState(state: string, function_: HookFunction): void {
		this.#assertKnownState(state);

		this.#registerHook(state, function_);
	}

	public withStates(...states: string[]): this {
		for (const state of states) {
			this.#assertKnownState(state);

			this.#modifiers.states.add(state);
		}

		return this;
	}

	public withAttributes(attributes: object): this {
		this.#modifiers.attributes = attributes;

		return this;
	}

	public withOptions(options: FactoryFunctionOptions): this {
		this.#modifiers.options = options;

		return this;
	}

	public async make<T>(resetModifiers = true): Promise<T> {
		const states: string[] = [...this.#modifiers.states.values()];
		const initialState: string | undefined = states.shift();

		Utils.assert.defined<string>(initialState);

		const function_: FactoryFunction | undefined = this.#states.get(initialState);

		Utils.assert.defined<FactoryFunction>(function_);

		let result: T = await function_({
			entity: undefined,
			options: this.#modifiers.options,
		});

		this.#applyHooks(initialState, result);

		// We apply all states in order of insertion to guarantee consistency.
		for (const state of states) {
			const function_: FactoryFunction | undefined = this.#states.get(state);

			Utils.assert.defined<FactoryFunction>(function_);

			result = await function_({
				entity: result,
				options: this.#modifiers.options,
			});

			// We apply all hooks in order of insertion to guarantee consistency.
			this.#applyHooks(state, result);
		}

		for (const [key, value] of Object.entries(this.#modifiers.attributes)) {
			result[key] = value;
		}

		if (resetModifiers) {
			this.#resetModifiers();
		}

		return result;
	}

	public async makeMany<T>(count: number): Promise<T[]> {
		const entities: T[] = [];

		for (let index = 0; index < count; index++) {
			entities.push(await this.make<T>(false));
		}

		this.#resetModifiers();

		return entities;
	}

	#registerHook(state: string, function_: HookFunction): void {
		if (!this.#hooks.has(state)) {
			this.#hooks.set(state, new Set());
		}

		const hooks: Set<HookFunction> | undefined = this.#hooks.get(state);

		Utils.assert.defined<Set<HookFunction>>(hooks);

		hooks.add(function_);

		this.#hooks.set(state, hooks);
	}

	#assertKnownState(state: string): void {
		strictEqual(this.#states.has(state), true, `The [${state}] state is unknown.`);
	}

	#applyHooks<T>(state: string, value: T): void {
		const hooks: Set<HookFunction> | undefined = this.#hooks.get(state);

		if (hooks) {
			for (const hook of hooks) {
				hook({ entity: value, options: {} }); // @TODO support hook options?
			}
		}
	}

	#resetModifiers(): void {
		this.#modifiers.states.clear();
		this.#modifiers.states.add("default");

		this.#modifiers.options = {};

		this.#modifiers.attributes = {};
	}
}
