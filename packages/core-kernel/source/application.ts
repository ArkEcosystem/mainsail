import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { existsSync, removeSync, writeFileSync } from "fs-extra";
import { join } from "path";

import { Bootstrappers } from "./bootstrap";
import { Bootstrapper } from "./bootstrap/interfaces";
import { KernelEvent } from "./enums";
import { ServiceProvider, ServiceProviderRepository } from "./providers";
import { ConfigRepository } from "./services/config";
import { ServiceProvider as EventServiceProvider } from "./services/events/service-provider";
import { JsonObject, KeyValuePair } from "./types";
import { Constructor } from "./types/container";

export class Application implements Contracts.Kernel.Application {
	#booted = false;

	public constructor(public readonly container: Contracts.Kernel.Container.Container) {
		// @TODO enable this after solving the event emitter limit issues
		// this.listenToShutdownSignals();

		this.bind<Contracts.Kernel.Application>(Identifiers.Application).toConstantValue(this);

		this.bind<ConfigRepository>(Identifiers.ConfigRepository).to(ConfigRepository).inSingletonScope();

		this.bind<ServiceProviderRepository>(Identifiers.ServiceProviderRepository)
			.to(ServiceProviderRepository)
			.inSingletonScope();
	}

	public async bootstrap(options: { flags: JsonObject; plugins?: JsonObject }): Promise<void> {
		this.bind<KeyValuePair>(Identifiers.ConfigFlags).toConstantValue(options.flags);
		this.bind<KeyValuePair>(Identifiers.ConfigPlugins).toConstantValue(options.plugins || {});

		await this.#registerEventDispatcher();

		await this.#bootstrapWith("app");
	}

	public async boot(): Promise<void> {
		await this.#bootstrapWith("serviceProviders");

		this.#booted = true;
	}

	public async reboot(): Promise<void> {
		await this.#disposeServiceProviders();

		await this.boot();
	}

	public config<T = any>(key: string, value?: T): T | undefined {
		const config: ConfigRepository = this.get<ConfigRepository>(Identifiers.ConfigRepository);

		if (value) {
			config.set(key, value);
		}

		return config.get(key);
	}

	public dirPrefix(): string {
		return this.get(Identifiers.ApplicationDirPrefix);
	}

	public namespace(): string {
		return this.get(Identifiers.ApplicationNamespace);
	}

	public version(): string {
		return this.get(Identifiers.ApplicationVersion);
	}

	public token(): string {
		return this.get(Identifiers.ApplicationToken);
	}

	public network(): string {
		return this.get(Identifiers.ApplicationNetwork);
	}

	public useNetwork(value: string): void {
		this.rebind<string>(Identifiers.ApplicationNetwork).toConstantValue(value);
	}

	public dataPath(path = ""): string {
		return join(this.#getPath("data"), path);
	}

	public useDataPath(path: string): void {
		this.#usePath("data", path);
	}

	public configPath(path = ""): string {
		return join(this.#getPath("config"), path);
	}

	public useConfigPath(path: string): void {
		this.#usePath("config", path);
	}

	public cachePath(path = ""): string {
		return join(this.#getPath("cache"), path);
	}

	public useCachePath(path: string): void {
		this.#usePath("cache", path);
	}

	public logPath(path = ""): string {
		return join(this.#getPath("log"), path);
	}

	public useLogPath(path: string): void {
		this.#usePath("log", path);
	}

	public tempPath(path = ""): string {
		return join(this.#getPath("temp"), path);
	}

	public useTempPath(path: string): void {
		this.#usePath("temp", path);
	}

	public environmentFile(): string {
		return this.configPath(".env");
	}

	public environment(): string {
		return this.get(Identifiers.ApplicationEnvironment);
	}

	public useEnvironment(value: string): void {
		this.rebind<string>(Identifiers.ApplicationEnvironment).toConstantValue(value);
	}

	public isProduction(): boolean {
		return this.environment() === "production" || this.network() === "mainnet";
	}

	public isDevelopment(): boolean {
		return this.environment() === "development" || ["devnet", "testnet"].includes(this.network());
	}

	public runningTests(): boolean {
		return this.environment() === "test" || this.network() === "testnet";
	}

	public isBooted(): boolean {
		return this.#booted;
	}

	public enableMaintenance(): void {
		writeFileSync(this.tempPath("maintenance"), JSON.stringify({ time: Date.now() }));

		this.get<Contracts.Kernel.Logger>(Identifiers.LogService).notice("Application is now in maintenance mode.");

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService).dispatch(
			"kernel.maintenance",
			true,
		);
	}

	public disableMaintenance(): void {
		removeSync(this.tempPath("maintenance"));

		this.get<Contracts.Kernel.Logger>(Identifiers.LogService).notice("Application is now live.");

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService).dispatch(
			"kernel.maintenance",
			false,
		);
	}

	public isDownForMaintenance(): boolean {
		return existsSync(this.tempPath("maintenance"));
	}

	public async terminate(reason?: string, error?: Error): Promise<void> {
		this.#booted = false;

		if (reason) {
			this.get<Contracts.Kernel.Logger>(Identifiers.LogService).notice(reason);
		}

		if (error) {
			this.get<Contracts.Kernel.Logger>(Identifiers.LogService).error(error.stack);
		}

		await this.#disposeServiceProviders();
	}

	public bind<T>(
		serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>,
	): Contracts.Kernel.Container.BindingToSyntax<T> {
		return this.container.bind(serviceIdentifier);
	}

	public rebind<T>(
		serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>,
	): Contracts.Kernel.Container.BindingToSyntax<T> {
		if (this.container.isBound(serviceIdentifier)) {
			this.container.unbind(serviceIdentifier);
		}

		return this.container.bind(serviceIdentifier);
	}

	public unbind<T>(serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>): void {
		return this.container.unbind(serviceIdentifier);
	}

	public get<T>(serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>): T {
		return this.container.get(serviceIdentifier);
	}

	public getTagged<T>(
		serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>,
		key: string | number | symbol,
		value: any,
	): T {
		return this.container.getTagged(serviceIdentifier, key, value);
	}

	public isBound<T>(serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>): boolean {
		return this.container.isBound(serviceIdentifier);
	}

	public resolve<T>(constructorFunction: Contracts.Kernel.Container.Newable<T>): T {
		return this.container.resolve(constructorFunction);
	}

	async #bootstrapWith(type: string): Promise<void> {
		const bootstrappers: Constructor<Bootstrapper>[] = Object.values(Bootstrappers[type]);
		const events: Contracts.Kernel.EventDispatcher = this.get(Identifiers.EventDispatcherService);

		for (const bootstrapper of bootstrappers) {
			await events.dispatch(KernelEvent.Bootstrapping, { bootstrapper: bootstrapper.name });

			await this.resolve<Bootstrapper>(bootstrapper).bootstrap();

			await events.dispatch(KernelEvent.Bootstrapped, { bootstrapper: bootstrapper.name });
		}
	}

	async #registerEventDispatcher(): Promise<void> {
		await this.resolve(EventServiceProvider).register();
	}

	async #disposeServiceProviders(): Promise<void> {
		const serviceProviders: ServiceProvider[] = this.get<ServiceProviderRepository>(
			Identifiers.ServiceProviderRepository,
		).allLoadedProviders();

		for (const serviceProvider of serviceProviders.reverse()) {
			this.get<Contracts.Kernel.Logger>(Identifiers.LogService).debug(`Disposing ${serviceProvider.name()}...`);

			try {
				await serviceProvider.dispose();
			} catch {}
		}
	}

	#getPath(type: string): string {
		const path: string = this.get<string>(`path.${type}`);

		if (!existsSync(path)) {
			throw new Exceptions.DirectoryCannotBeFound(path);
		}

		return path;
	}

	#usePath(type: string, path: string): void {
		if (!existsSync(path)) {
			throw new Exceptions.DirectoryCannotBeFound(path);
		}

		this.rebind<string>(`path.${type}`).toConstantValue(path);
	}

	//
	// #listenToShutdownSignals(): void {
	//     for (const signal in ShutdownSignal) {
	//         process.on(signal as any, async code => {
	//             await this.terminate(signal);

	//             process.exit(code || 1);
	//         });
	//     }
	// }
}
