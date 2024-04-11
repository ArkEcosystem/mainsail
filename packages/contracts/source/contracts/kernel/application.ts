import { JsonObject } from "../types/index.js";
import { Container } from "./container.js";

export interface Application {
	readonly container: Container.Container;

	bootstrap({ flags, plugins }: { flags: JsonObject; plugins?: JsonObject }): Promise<void>;

	boot(): void;

	reboot(): void;

	config<T = any>(key: string, value?: T, defaultValue?: T): T | undefined;

	version(): string;

	name(): string;

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

	terminate(reason?: string, error?: Error): Promise<void>;

	bind<T>(serviceIdentifier: Container.ServiceIdentifier<T>): Container.BindingToSyntax<T>;

	rebind<T>(serviceIdentifier: Container.ServiceIdentifier<T>): Container.BindingToSyntax<T>;

	unbind<T>(serviceIdentifier: Container.ServiceIdentifier<T>): void;

	get<T>(serviceIdentifier: Container.ServiceIdentifier<T>): T;

	getTagged<T>(serviceIdentifier: Container.ServiceIdentifier<T>, key: string | number | symbol, value: any): T;

	isBound<T>(serviceIdentifier: Container.ServiceIdentifier<T>): boolean;

	isBoundTagged<T>(
		serviceIdentifier: Container.ServiceIdentifier<T>,
		key: string | number | symbol,
		value: any,
	): boolean;

	resolve<T>(constructorFunction: Container.Newable<T>): T;
}

export interface PluginDependency {
	name: string;

	version?: string;

	required?: boolean | (() => Promise<boolean>);
}

export interface Bootstrapper {
	bootstrap(): Promise<void>;
}
