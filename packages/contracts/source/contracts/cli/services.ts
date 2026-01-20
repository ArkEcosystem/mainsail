import type { Enums } from "@mainsail/constants";

import type { InputValues } from "./cli.js";
import type { Paths } from "./paths.js";


export interface Config {
	all: object;
	get<T>(key: string): T;
	set<T>(key: string, value: T): void;
	forget(key: string): void;
	has(key: string): boolean;
	load(): void;
	save(): void;
	restoreDefaults(): void;
}

export interface Environment {
	getPaths(): Paths;
	updateVariables(environmentFile: string, variables: InputValues): void;
}


export interface Installer {
	install(package_: string): void;
	installPeerDependencies(package_: string, tag: string): void;
	installRangeLatest(package_: string, range: string): void;
}

export interface Logger {
	alert(message: string): void;
	error(message: string): void;
	warn(message: string): void;
	notice(message: string): void;
	info(message: string): void;
	debug(message: string): void;
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


export interface Setup {
	isGlobal(): boolean;
	getEntrypoint(): string;
	getGlobalEntrypoint(packageId: string): string;
}

export interface Updater {
	logStatus(): Promise<void>;
	check(force?: boolean): Promise<boolean>;
	update(updateProcessManager?: boolean, force?: boolean): Promise<boolean>;
	getLatestVersion(): Promise<string | undefined>;
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
