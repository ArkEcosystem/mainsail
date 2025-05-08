import { JsonObject } from "../types/index.js";
import { BindToFluentSyntax, Container, Newable, ServiceIdentifier } from "./container.js";

export interface Application {
	readonly container: Container;

	bootstrap({ flags, plugins }: { flags: JsonObject; plugins?: JsonObject }): Promise<void>;

	boot(): void;

	reboot(): void;

	config<T = any>(key: string, value?: T, defaultValue?: T): T | undefined;

	version(): string;

	name(): string;

	thread(): string;

	dataPath(path?: string): string;

	useDataPath(path: string): void;

	configPath(path?: string): string;

	useConfigPath(path: string): void;

	cachePath(path?: string): string;

	useCachePath(path: string): void;

	logPath(path?: string): string;

	useLogPath(path: string): void;

	tempPath(path?: string): string;

	useTempPath(path: string): void;

	environmentFile(): string;

	environment(): string;

	useEnvironment(value: string): void;

	isBooted(): boolean;

	isWorker(): boolean;

	enableMaintenance(): void;

	disableMaintenance(): void;

	isDownForMaintenance(): boolean;

	terminate(reason?: string, error?: Error): Promise<never>;

	bind<T>(serviceIdentifier: ServiceIdentifier<T>): BindToFluentSyntax<T>;

	rebind<T>(serviceIdentifier: ServiceIdentifier<T>): BindToFluentSyntax<T>;

	unbind<T>(serviceIdentifier: ServiceIdentifier<T>): void;

	get<T>(serviceIdentifier: ServiceIdentifier<T>): T;

	getTagged<T>(serviceIdentifier: ServiceIdentifier<T>, key: string | number | symbol, value: any): T;

	isBound<T>(serviceIdentifier: ServiceIdentifier<T>): boolean;

	isBoundTagged<T>(serviceIdentifier: ServiceIdentifier<T>, key: string | number | symbol, value: any): boolean;

	resolve<T>(constructorFunction: Newable<T>): T;
}

export interface PluginDependency {
	name: string;

	version?: string;

	required?: boolean | (() => Promise<boolean>);
}

export interface Bootstrapper {
	bootstrap(): Promise<void>;
}
