import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { ActionFactory } from "../action-factory.js";
import { ComponentFactory } from "../component-factory.js";
import { Box } from "../components/index.js";
import { InputDefinition } from "../input/definition.js";
import { Input } from "../input/index.js";
import { Output } from "../output/index.js";
import { Config, Environment } from "../services/index.js";
import { CommandHelp } from "./command-help.js";

@injectable()
export abstract class Command implements Contracts.Cli.Command {
	@inject(Identifiers.Cli.Application.Instance)
	protected readonly app!: Contracts.Cli.Application;

	@inject(Identifiers.Cli.Service.Environment)
	protected readonly env!: Environment;

	@inject(Identifiers.Cli.Output.Instance)
	protected readonly output!: Output;

	@inject(Identifiers.Cli.Service.Config)
	protected readonly config!: Config;

	@inject(Identifiers.Cli.Package)
	protected readonly pkg!: Contracts.Types.PackageJson;

	@inject(Identifiers.Cli.Action.Factory)
	protected readonly actions!: ActionFactory;

	@inject(Identifiers.Cli.Component.Factory)
	protected readonly components!: ComponentFactory;

	public signature!: string;

	public description: string | undefined;

	public isHidden = false;

	public definition: InputDefinition = new InputDefinition();

	protected input!: Input;

	public register(argv: string[]): void {
		try {
			this.input = this.app.resolve(Input);
			this.input.parse(argv, this.definition);
			this.input.bind();
			this.input.validate();

			if (this.input.hasFlag("quiet")) {
				this.output.setVerbosity(0);
			} else {
				this.output.setVerbosity(this.input.getFlag("v") || 1);
			}
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
		this.app.get<Box>(Identifiers.Cli.Component.Box).render(this.app.resolve(CommandHelp).render(this));
	}

	public getArguments(): Contracts.Cli.InputValues {
		return this.input.getArguments();
	}

	public getArgument(name: string): string {
		return this.input.getArgument(name) as string;
	}

	public setArgument(name: string, value: Contracts.Cli.InputValue): void {
		return this.input.setArgument(name, value);
	}

	public hasArgument(name: string): boolean {
		return this.input.hasArgument(name);
	}

	public getFlags<T = Contracts.Cli.InputValues>(): T {
		return this.input.getFlags() as T;
	}

	public getFlag<T = Contracts.Cli.InputValue>(name: string): T {
		return this.input.getFlag(name);
	}

	public setFlag(name: string, value: Contracts.Cli.InputValue): void {
		return this.input.setFlag(name, value);
	}

	public hasFlag(name: string): boolean {
		return this.input.hasFlag(name);
	}

	public abstract execute(): Promise<void>;
}
