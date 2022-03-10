import { Application } from "../application";
import { InputValue, InputValues } from "../contracts";
import { Identifiers, inject, injectable } from "../ioc";
import { InputDefinition } from "./definition";
import { InputParser } from "./parser";
import { InputValidator } from "./validator";

@injectable()
export class Input {
	@inject(Identifiers.Application)
	protected readonly app!: Application;

	@inject(Identifiers.InputValidator)
	protected readonly validator!: InputValidator;

	public args: InputValues = {};

	public flags: InputValues = {};

	public interactive = true;

	#definition!: InputDefinition;

	#rawArgs: string[] = [];

	#rawFlags: object = {};

	public parse(argv: string[], definition: InputDefinition): void {
		this.#definition = definition;

		const { args, flags } = InputParser.parseArgv(argv);

		this.#rawArgs = args;
		this.#rawFlags = flags;
	}

	public bind(): void {
		const keys: string[] = Object.keys(this.#definition.getArguments());
		const values: string[] = [...this.#rawArgs].slice(1);

		for (const [i, key] of keys.entries()) {
			this.args[key] = values[i];
		}

		this.flags = this.#rawFlags;
	}

	public validate(): void {
		const definitionToSchema = (definition: InputValues): object => {
			const schema: object = {};

			for (const [key, value] of Object.entries(definition)) {
				schema[key] = value.schema;
			}

			return schema;
		};

		if (Object.keys(this.args).length > 0) {
			this.args = this.validator.validate(this.args, definitionToSchema(this.#definition.getArguments()));
		}

		this.flags = this.validator.validate(this.flags, definitionToSchema(this.#definition.getFlags()));
	}

	public getArguments(values?: object) {
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

	public getFlags(values?: object) {
		return values ? { ...values, ...this.flags } : this.flags;
	}

	public getFlag<T = string>(name: string): InputValue {
		return this.flags[name];
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
