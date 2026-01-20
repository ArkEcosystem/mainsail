import type { InputValue, InputValues } from "./cli.js";

export interface Command {
	signature: string;
	description?: string;
	isHidden: boolean;
	register(argv: string[]): void;
	initialize(): Promise<void>;
	interact(): Promise<void>;
	run(): Promise<void>;
	showHelp(): void;
	getArguments(): InputValues;
	getArgument(name: string): string;
	setArgument(name: string, value: InputValue): void;
	hasArgument(name: string): boolean;
	getFlags<T = InputValues>(): T;
	getFlag<T = InputValue>(name: string): T;
	setFlag(name: string, value: InputValue): void;
	hasFlag(name: string): boolean;
	execute(): Promise<void>;
}

export type CommandList = Record<string, Command>;

export interface DiscoverCommands {
	within(path: string): Promise<CommandList>;
	from(packages: string[]): Promise<CommandList>;
}
