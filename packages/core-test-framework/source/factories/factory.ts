import { Utils } from "@arkecosystem/core-kernel";
import { strictEqual } from "assert";

import { FactoryFunction, FactoryFunctionOptions, HookFunction } from "./types";

export class Factory {
	private readonly states: Map<string, FactoryFunction> = new Map<string, FactoryFunction>();

	private readonly hooks: Map<string, Set<HookFunction>> = new Map<string, Set<HookFunction>>();

	private readonly modifiers: {
		states: Set<string>;
		attributes: object;
		options: FactoryFunctionOptions;
	} = {
		states: new Set<string>(["default"]),
		attributes: {},
		options: {},
	};

	public state(state: string, fn: FactoryFunction): boolean {
		this.states.set(state, fn);

		return this.states.has(state);
	}

	public afterMaking(fn: HookFunction): void {
		this.afterMakingState("default", fn);
	}

	public afterMakingState(state: string, fn: HookFunction): void {
		this.assertKnownState(state);

		this.registerHook(state, fn);
	}

	public withStates(...states: string[]): this {
		for (const state of states) {
			this.assertKnownState(state);

			this.modifiers.states.add(state);
		}

		return this;
	}

	public withAttributes(attributes: object): this {
		this.modifiers.attributes = attributes;

		return this;
	}

	public withOptions(options: FactoryFunctionOptions): this {
		this.modifiers.options = options;

		return this;
	}

	public make<T>(resetModifiers: boolean = true): T {
		const states: string[] = [...this.modifiers.states.values()];
		const initialState: string | undefined = states.shift();

		Utils.assert.defined<string>(initialState);

		const fn: FactoryFunction | undefined = this.states.get(initialState);

		Utils.assert.defined<FactoryFunction>(fn);

		let result: T = fn({
			entity: undefined,
			options: this.modifiers.options,
		});

		this.applyHooks(initialState, result);

		// We apply all states in order of insertion to guarantee consistency.
		for (const state of states) {
			const fn: FactoryFunction | undefined = this.states.get(state);

			Utils.assert.defined<FactoryFunction>(fn);

			result = fn({
				entity: result,
				options: this.modifiers.options,
			});

			// We apply all hooks in order of insertion to guarantee consistency.
			this.applyHooks(state, result);
		}

		for (const [key, value] of Object.entries(this.modifiers.attributes)) {
			result[key] = value;
		}

		if (resetModifiers) {
			this.resetModifiers();
		}

		return result;
	}

	public makeMany<T>(count: number): T[] {
		const entities: T[] = [];

		for (let i = 0; i < count; i++) {
			entities.push(this.make<T>(false));
		}

		this.resetModifiers();

		return entities;
	}

	private registerHook(state: string, fn: HookFunction): void {
		if (!this.hooks.has(state)) {
			this.hooks.set(state, new Set());
		}

		const hooks: Set<HookFunction> | undefined = this.hooks.get(state);

		Utils.assert.defined<Set<HookFunction>>(hooks);

		hooks.add(fn);

		this.hooks.set(state, hooks);
	}

	private assertKnownState(state: string): void {
		strictEqual(this.states.has(state), true, `The [${state}] state is unknown.`);
	}

	private applyHooks<T>(state: string, value: T): void {
		const hooks: Set<HookFunction> | undefined = this.hooks.get(state);

		if (hooks) {
			for (const hook of hooks) {
				hook({ entity: value, options: {} }); // todo: support hook options?
			}
		}
	}

	private resetModifiers(): void {
		this.modifiers.states.clear();
		this.modifiers.states.add("default");

		this.modifiers.options = {};

		this.modifiers.attributes = {};
	}
}
