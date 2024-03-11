import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { ActionFactory } from "../action-factory.js";
import { ComponentFactory } from "../component-factory.js";
import { Box } from "../components/index.js";
import { Application, InputValue } from "../contracts.js";
import { InputDefinition } from "../input/definition.js";
import { Input } from "../input/index.js";
import { Identifiers } from "../ioc/index.js";
import { Output } from "../output/index.js";
import { Config, Environment } from "../services/index.js";
import { CommandHelp } from "./command-help.js";

@injectable()
export abstract class Command {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Application;

	@inject(Identifiers.Environment)
	protected readonly env!: Environment;

	@inject(Identifiers.Output)
	protected readonly output!: Output;

	@inject(Identifiers.Config)
	protected readonly config!: Config;

	@inject(Identifiers.Package)
	protected readonly pkg!: Contracts.Types.PackageJson;

	@inject(Identifiers.ActionFactory)
	protected readonly actions!: ActionFactory;

	@inject(Identifiers.ComponentFactory)
	protected readonly components!: ComponentFactory;

	public signature!: string;

	public description: string | undefined;

	public isHidden = false;

	protected definition: InputDefinition = new InputDefinition();

	protected input!: Input;

	@postConstruct()
	// @TODO for some reason this isn't recognized in tests for being called
	public configure(): void {
		// Do nothing...
	}

	public register(argv: string[]) {
		try {
			this.input = this.app.resolve(Input);
			this.input.parse(argv, this.definition);
			this.input.bind();
			this.input.validate();

			this.input.hasFlag("quiet")
				? this.output.setVerbosity(0)
				: this.output.setVerbosity(this.input.getFlag("v") || 1);
		} catch (error) {
			this.components.fatal(error.message);
		}
	}

	public async initialize(): Promise<void> {
		// Do nothing...
	}

	public async interact(): Promise<void> {
		// Do nothing...
	}

	public async run(): Promise<void> {
		try {
			await this.initialize();

			if (this.input.isInteractive()) {
				await this.interact();
			}

			await this.execute();
		} catch (error) {
			this.components.fatal(error.message);
		}
	}

	public showHelp(): void {
		this.app.get<Box>(Identifiers.Box).render(this.app.resolve(CommandHelp).render(this));
	}

	public getArguments(): Record<string, any> {
		return this.input.getArguments();
	}

	public getArgument(name: string) {
		return this.input.getArgument(name);
	}

	public setArgument(name: string, value: InputValue): void {
		return this.input.setArgument(name, value);
	}

	public hasArgument(name: string): boolean {
		return this.input.hasArgument(name);
	}

	public getFlags(): Record<string, any> {
		return this.input.getFlags();
	}

	public getFlag(name: string) {
		return this.input.getFlag(name);
	}

	public setFlag(name: string, value: InputValue): void {
		return this.input.setFlag(name, value);
	}

	public hasFlag(name: string): boolean {
		return this.input.hasFlag(name);
	}

	public abstract execute(): Promise<void>;
}
