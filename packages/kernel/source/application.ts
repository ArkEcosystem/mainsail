import { exit } from "node:process";

import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { existsSync, removeSync, writeFileSync } from "fs-extra";
import { join } from "path";

import { Bootstrappers } from "./bootstrap";
import { Bootstrapper } from "./bootstrap/interfaces";
import { KernelEvent, ShutdownSignal } from "./enums";
import { ServiceProvider, ServiceProviderRepository } from "./providers";
import { ConfigRepository } from "./services/config";
import { ServiceProvider as EventServiceProvider } from "./services/events/service-provider";
import { KeyValuePair } from "./types";
import { Constructor } from "./types/container";

export class Application implements Contracts.Kernel.Application {
	#booted = false;
	#terminating = false;

	public constructor(public readonly container: Contracts.Kernel.Container.Container) {
		this.#listenToShutdownSignals();

		this.bind<Contracts.Kernel.Application>(Identifiers.Application).toConstantValue(this);

		this.bind<ConfigRepository>(Identifiers.ConfigRepository).to(ConfigRepository).inSingletonScope();

		this.bind<ServiceProviderRepository>(Identifiers.ServiceProviderRepository)
			.to(ServiceProviderRepository)
			.inSingletonScope();
	}

	public async bootstrap(options: {
		flags: Contracts.Types.JsonObject;
		plugins?: Contracts.Types.JsonObject;
	}): Promise<void> {
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

	public config<T = any>(key: string, value?: T, defaultValue?: T): T | undefined {
		const config: ConfigRepository = this.get<ConfigRepository>(Identifiers.ConfigRepository);

		if (value) {
			config.set(key, value);
		}

		return config.get(key, defaultValue);
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

	public name(): string {
		return this.get(Identifiers.ApplicationName);
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

	public isWorker(): boolean {
		return this.config("worker", undefined, false) ?? false;
	}

	public enableMaintenance(): void {
		writeFileSync(this.tempPath("maintenance"), JSON.stringify({ time: Date.now() }));

		this.get<Contracts.Kernel.Logger>(Identifiers.Kernel.Log.Service).notice(
			"Application is now in maintenance mode.",
		);

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.get<Contracts.Kernel.EventDispatcher>(Identifiers.Kernel.EventDispatcher.Service).dispatch(
			"kernel.maintenance",
			true,
		);
	}

	public disableMaintenance(): void {
		removeSync(this.tempPath("maintenance"));

		this.get<Contracts.Kernel.Logger>(Identifiers.Kernel.Log.Service).notice("Application is now live.");

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.get<Contracts.Kernel.EventDispatcher>(Identifiers.Kernel.EventDispatcher.Service).dispatch(
			"kernel.maintenance",
			false,
		);
	}

	public isDownForMaintenance(): boolean {
		return existsSync(this.tempPath("maintenance"));
	}

	public async terminate(reason?: string, error?: Error): Promise<void> {
		this.#booted = false;

		if (this.#terminating) {
			this.get<Contracts.Kernel.Logger>(Identifiers.Kernel.Log.Service).warning(
				"Force application termination. Graceful shutdown was interrupted.",
			);
			exit(1);
		}
		this.#terminating = true;

		const message = `reason: ${reason} error: ${error?.message}`;
		if (reason || error) {
			this.get<Contracts.Kernel.Logger>(Identifiers.Kernel.Log.Service)[error ? "error" : "warning"](message);
		}

		if (error) {
			let errors: Error[] = [error];

			// Check for AggregateError
			if ("errors" in error) {
				errors = [...errors, ...(error as unknown as Record<string, any>).errors];
			}

			for (const error of errors) {
				this.get<Contracts.Kernel.Logger>(Identifiers.Kernel.Log.Service).error(error.stack ?? error.message);
			}
		}

		const timeout = setTimeout(() => {
			this.get<Contracts.Kernel.Logger>(Identifiers.Kernel.Log.Service).warning(
				"Force application termination. Service providers did not dispose in time.",
			);
			exit(1);
		}, 3000);

		await this.#disposeServiceProviders();
		clearTimeout(timeout);

		// Await all async operations to finish
		await new Promise((resolve) => setTimeout(resolve, 0));

		this.#logOpenHandlers();

		this.get<Contracts.Kernel.Logger>(Identifiers.Kernel.Log.Service).notice(
			"Application is gracefully terminated.",
		);

		exit(1);
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

	public isBoundTagged<T>(
		serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>,
		key: string | number | symbol,
		value: any,
	): boolean {
		return this.container.isBoundTagged(serviceIdentifier, key, value);
	}

	public resolve<T>(constructorFunction: Contracts.Kernel.Container.Newable<T>): T {
		return this.container.resolve(constructorFunction);
	}

	async #bootstrapWith(type: string): Promise<void> {
		const bootstrappers: Constructor<Bootstrapper>[] = Object.values(Bootstrappers[type]);
		const events: Contracts.Kernel.EventDispatcher = this.get(Identifiers.Kernel.EventDispatcher.Service);

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
			this.get<Contracts.Kernel.Logger>(Identifiers.Kernel.Log.Service).debug(
				`Disposing ${serviceProvider.name()}...`,
			);

			try {
				await serviceProvider.dispose();
			} catch {}
		}
	}

	#logOpenHandlers(): void {
		try {
			// @ts-ignore
			const resourcesInfo: string[] = process.getActiveResourcesInfo(); // Method is experimental

			const timeouts = resourcesInfo.filter((resource) => resource.includes("Timeout"));
			const fsRequests = resourcesInfo.filter((resource) => resource.includes("FSReqCallback"));

			if (timeouts.length > 0 || fsRequests.length > 0) {
				this.get<Contracts.Kernel.Logger>(Identifiers.Kernel.Log.Service).warning(
					`There are ${timeouts.length} active timeouts and ${fsRequests.length} active file system requests.`,
				);
			}
		} catch {}
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

	#listenToShutdownSignals(): void {
		for (const signal in ShutdownSignal) {
			process.on(signal as any, async (code) => {
				await this.terminate(signal);
			});
		}
	}
}
