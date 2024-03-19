import { interfaces } from "@mainsail/container";
import { AnySchema } from "joi";
export { Paths } from "env-paths";

export type InputValue = any;
export type InputValues = Record<string, InputValue>;

export type InputArgument = { description: string; schema: AnySchema };
export type InputArguments = Record<string, InputArgument>;

export type AnyObject = Record<string, any>;

export type Arguments = Record<string, string | number>;

export type Flags = Record<string, string | number | boolean>;

export type CommandList = Record<string, any>;

export interface CommandArgument {
	description: string;
	schema: AnySchema;
}

export type CommandArguments = Record<string, CommandArgument>;

export interface CommandFlag {
	description: string;
	schema: AnySchema;
}

export type CommandFlags = Record<string, CommandFlag>;

export interface Config {
	get<T = string>(key: string): T;

	set<T>(key: string, value: T): void;

	forget(key: string): void;

	has(key: string): boolean;
}

export interface Updater {
	logStatus(): Promise<void>;

	check(force?: boolean): Promise<boolean>;

	update(updateProcessManager?: boolean, force?: boolean): Promise<boolean>;

	getLatestVersion(): Promise<string | undefined>;
}

export interface Setup {
	isGlobal(): boolean;
	getEntrypoint(): string;
	getGlobalEntrypoint(packageId: string): string;
}

export interface Installer {
	install(package_: string): void;

	installFromChannel(package_: string, channel: string): void;
}

export interface Plugin {
	path: string;
	name: string;
	version: string;
}

export interface PluginManager {
	list(): Promise<Plugin[]>;

	install(package_: string, version?: string): Promise<void>;

	update(package_: string): Promise<void>;

	remove(package_: string): Promise<void>;
}

export enum ProcessState {
	Online = "online",
	Stopped = "stopped",
	Stopping = "stopping",
	Waiting = "waiting restart",
	Launching = "launching",
	Errored = "errored",
	OneLaunch = "one-launch-status",
}

export type ProcessIdentifier = string | number;

export type ProcessDescription = Record<string, any>;

export type ProcessOptions = Record<"name" | "script" | "args", string>;

export interface Process {
	stop(daemon: boolean): void;
	restart(): void;
	status(): void;
	log(showErrors: boolean, lines: number): void;
}

export type ProcessFactory = (name: string) => Process;

// APPLICATION
export interface Application {
	bind<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): interfaces.BindingToSyntax<T>;

	rebind<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): interfaces.BindingToSyntax<T>;

	unbind<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): void;

	get<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): T;

	isBound<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): boolean;

	resolve<T>(constructorFunction: interfaces.Newable<T>): T;

	getCorePath(type: string, file?: string): string;

	getConsolePath(type: string, file?: string): string;
}
