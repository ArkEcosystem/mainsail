// import { Exception } from "@arkecosystem/core-contracts";

import { JsonObject } from "../types";
import { Container } from "./container";

export interface Application {
	readonly container: Container.Container;

	bootstrap({ flags, plugins }: { flags: JsonObject; plugins?: JsonObject }): Promise<void>;

	boot(): void;

	reboot(): void;

	config<T = any>(key: string, value?: T): T | undefined;

	namespace(): string;

	version(): string;

	token(): string;

	network(): string;

	useNetwork(value: string): void;

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

	isProduction(): boolean;

	isDevelopment(): boolean;

	runningTests(): boolean;

	isBooted(): boolean;

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

	resolve<T>(constructorFunction: Container.Newable<T>): T;
}

export interface PluginDependency {
	name: string;

	version?: string;

	required?: boolean | (() => Promise<boolean>);
}
