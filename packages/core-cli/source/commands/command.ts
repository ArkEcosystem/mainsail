import envPaths from "env-paths";
import { PackageJson } from "type-fest";

import { ActionFactory } from "../action-factory";
import { ComponentFactory } from "../component-factory";
import { Box } from "../components";
import { Application, InputValue } from "../contracts";
import { Input } from "../input";
import { InputDefinition } from "../input/definition";
import { Identifiers, inject, injectable, postConstruct } from "../ioc";
import { Output } from "../output";
import { Config, Environment } from "../services";
import { CommandHelp } from "./command-help";
import { DiscoverConfig } from "./discover-config";
import { DiscoverNetwork } from "./discover-network";

@injectable()
export abstract class Command {
	@inject(Identifiers.Application)
	protected readonly app!: Application;

	@inject(Identifiers.Environment)
	protected readonly env!: Environment;

	@inject(Identifiers.Output)
	protected readonly output!: Output;

	@inject(Identifiers.Config)
	protected readonly config!: Config;

	@inject(Identifiers.Package)
	protected readonly pkg!: PackageJson;

	@inject(Identifiers.ActionFactory)
	protected readonly actions!: ActionFactory;

	@inject(Identifiers.ComponentFactory)
	protected readonly components!: ComponentFactory;

	public signature!: string;

	public description: string | undefined;

	public isHidden = false;

	public requiresNetwork = true;

	protected definition: InputDefinition = new InputDefinition();

	protected input!: Input;

	@postConstruct()
	// todo: for some reason this isn't recognized in tests for being called
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
			await this.detectConfig();

			if (this.requiresNetwork) {
				await this.detectNetwork();
			}

			// Check for configuration again after network was chosen
			await this.detectConfig();

			if (this.input.hasFlag("token") && this.input.hasFlag("network")) {
				this.app
					.rebind(Identifiers.ApplicationPaths)
					.toConstantValue(this.env.getPaths(this.input.getFlag("token"), this.input.getFlag("network")));
			}

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

	private async detectConfig(): Promise<void> {
		const config = await this.app
			.resolve(DiscoverConfig)
			.discover(this.input.getFlag("token"), this.input.getFlag("network"));

		if (config) {
			this.input.setFlag("token", config.token);
			this.input.setFlag("network", config.network);
		}
	}

	private async detectNetwork(): Promise<void> {
		const requiresNetwork: boolean = Object.keys(this.definition.getFlags()).includes("network");

		if (requiresNetwork && !this.input.hasFlag("network")) {
			this.input.setFlag(
				"network",
				await this.app.resolve(DiscoverNetwork).discover(
					envPaths(this.input.getFlag("token"), {
						suffix: "core",
					}).config,
				),
			);
		}
	}

	public abstract execute(): Promise<void>;
}
