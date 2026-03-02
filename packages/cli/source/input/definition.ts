import type { Contracts } from "@mainsail/contracts";
import type { AnySchema } from "joi";

export class InputDefinition {
	readonly #arguments: Contracts.Cli.InputArguments = {};

	readonly #flags: Contracts.Cli.InputArguments = {};

	public getArguments(): Contracts.Cli.InputArguments {
		return this.#arguments;
	}

	public getArgument(name: string): Contracts.Cli.InputArgument {
		return this.#arguments[name];
	}

	public setArgument(name: string, description: string, schema: AnySchema): this {
		this.#arguments[name] = { description, schema };

		return this;
	}

	public hasArgument(name: string): boolean {
		return this.#arguments[name] !== undefined;
	}

	public getFlags(): Contracts.Cli.InputArguments {
		return this.#flags;
	}

	public getFlag(name: string): Contracts.Cli.InputArgument {
		return this.#flags[name];
	}

	public setFlag(name: string, description: string, schema: AnySchema): this {
		this.#flags[name] = { description, schema };

		return this;
	}

	public hasFlag(name: string): boolean {
		return this.#flags[name] !== undefined;
	}
}
