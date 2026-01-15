import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { Application } from "../application.js";
import { InputArguments, InputValue, InputValues } from "../contracts.js";
import { InputDefinition } from "./definition.js";
import { InputParser } from "./parser.js";
import { InputValidator } from "./validator.js";

@injectable()
export class Input {
	@inject(Identifiers.Cli.Application.Instance)
	protected readonly app!: Application;

	@inject(Identifiers.Cli.Input.Validator)
	protected readonly validator!: InputValidator;

	public args: InputValues = {};

	public flags: InputValues = {};

	public interactive = true;

	#definition!: InputDefinition;

	#rawArgs: (string | number)[] = [];

	#rawFlags: object = {};

	public parse(argv: string[], definition: InputDefinition): void {
		this.#definition = definition;

		const { args, flags } = InputParser.parseArgv(argv);

		this.#rawArgs = args;
		this.#rawFlags = flags;
	}

	public bind(): void {
		const keys: string[] = Object.keys(this.#definition.getArguments());
		const values: (string | number)[] = [...this.#rawArgs].slice(1);

		for (const [index, key] of keys.entries()) {
			this.args[key] = values[index];
		}

		this.flags = this.#rawFlags as InputValues;
	}

	public validate(): void {
		const definitionToSchema = (definition: InputArguments): object => {
			const schema: object = {};

			for (const [key, value] of Object.entries(definition)) {
				schema[key] = value.schema;
			}

			return schema;
		};

		if (Object.keys(this.args).length > 0) {
			this.args = this.validator.validate(
				this.args,
				definitionToSchema(this.#definition.getArguments()),
			) as InputValues;
		}

		this.flags = this.validator.validate(
			this.flags,
			definitionToSchema(this.#definition.getFlags()),
		) as InputValues;
	}

	public getArguments(values?: object): InputValues {
		return values ? { ...values, ...this.args } : this.args;
	}

	public getArgument(name: string): InputValue {
		return this.args[name];
	}

	public setArgument(name: string, value: InputValue): void {
		this.args[name] = value;
	}

	public hasArgument(name: string): boolean {
		return this.args[name] !== undefined;
	}

	public getFlags(values?: object): InputValues {
		return values ? { ...values, ...this.flags } : this.flags;
	}

	public getFlag<T = InputValue>(name: string): T {
		return this.flags[name] as T;
	}

	public setFlag(name: string, value: InputValue): void {
		this.flags[name] = value;
	}

	public hasFlag(name: string): boolean {
		return this.flags[name] !== undefined;
	}

	public isInteractive(): boolean {
		return this.getFlag("interaction");
	}
}
