import type { Enums } from "@mainsail/constants";
import type { AnySchema } from "joi";

import type { Container } from "./kernel/index.js";
export type { Paths } from "env-paths";

export type InputValue = string | number | boolean;
export type InputValues = Record<string, InputValue>;

export type InputArgument = { description: string; schema: AnySchema };
export type InputArguments = Record<string, InputArgument>;

export type AnyObject = Record<string, string | number | boolean>;

export type Arguments = Record<string, string | number>;

export type Flags = Record<string, string | number | boolean>;

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

export type ProcessIdentifier = string | number;

export type ProcessState = Enums.Cli.ProcessState;

export type ProcessDescription = {
	readonly pid: number;
	readonly name: string;
	readonly pm2_env: {
		readonly version: string;
		readonly status: ProcessState;
		readonly pm_uptime: number;
		readonly pm_err_log_path: string;
		readonly pm_out_log_path: string;
	};
	readonly monit: {
		readonly cpu: number;
		readonly memory: number;
	};
};

export type ProcessOptions = Record<"name" | "script" | "args", string>;

export interface Process {
	stop(daemon: boolean): void;
	restart(): void;
	status(): void;
	log(showErrors: boolean, lines: number): void;
}

export type ProcessFactory = (name: string) => Process;

export interface Application {
	bind<T>(serviceIdentifier: Container.ServiceIdentifier<T>): Container.BindToFluentSyntax<T>;

	rebind<T>(serviceIdentifier: Container.ServiceIdentifier<T>): Container.BindToFluentSyntax<T>;

	unbind<T>(serviceIdentifier: Container.ServiceIdentifier<T>): void;

	get<T>(serviceIdentifier: Container.ServiceIdentifier<T>): T;

	isBound<T>(serviceIdentifier: Container.ServiceIdentifier<T>): boolean;

	resolve<T>(constructorFunction: Container.Newable<T>): T;

	getCorePath(type: string, file?: string): string;

	getConsolePath(type: string, file?: string): string;
}
