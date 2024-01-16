import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

import { KernelEvent } from "../enums";
import { assert } from "../utils";
import { ServiceProvider } from "./service-provider";

@injectable()
export class ServiceProviderRepository {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	readonly #serviceProviders: Map<string, ServiceProvider> = new Map<string, ServiceProvider>();

	readonly #loadedProviders: Set<string> = new Set<string>();

	readonly #failedProviders: Set<string> = new Set<string>();

	readonly #deferredProviders: Set<string> = new Set<string>();

	readonly #aliases: Map<string, string> = new Map<string, string>();

	public all(): Array<[string, ServiceProvider]> {
		return [...this.#serviceProviders.entries()];
	}

	public allLoadedProviders(): ServiceProvider[] {
		return [...this.#loadedProviders.values()].map((name: string) => this.get(name));
	}

	public get(name: string): ServiceProvider {
		const serviceProvider: ServiceProvider | undefined = this.#serviceProviders.get(
			this.#aliases.get(name) || name,
		);

		assert.defined<ServiceProvider>(serviceProvider);

		return serviceProvider;
	}

	public set(name: string, provider: ServiceProvider): void {
		this.#serviceProviders.set(name, provider);
	}

	public alias(name: string, alias: string): void {
		if (this.#aliases.has(alias)) {
			throw new Exceptions.InvalidArgumentException(`The alias [${alias}] is already in use.`);
		}

		if (!this.#serviceProviders.has(name)) {
			throw new Exceptions.InvalidArgumentException(`The service provider [${name}] is unknown.`);
		}

		this.#aliases.set(alias, name);
	}

	public has(name: string): boolean {
		return this.#serviceProviders.has(name);
	}

	public loaded(name: string): boolean {
		return this.#loadedProviders.has(name);
	}

	public failed(name: string): boolean {
		return this.#failedProviders.has(name);
	}

	public deferred(name: string): boolean {
		return this.#deferredProviders.has(name);
	}

	public load(name: string): void {
		this.#loadedProviders.add(name);
	}

	public fail(name: string): void {
		this.#failedProviders.add(name);
	}

	public defer(name: string): void {
		this.#deferredProviders.add(name);
	}

	public async register(name: string): Promise<void> {
		const serviceProvider = this.get(name);

		this.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(serviceProvider.config())
			.whenTargetTagged("plugin", name.split("/")[1]);

		await serviceProvider.register();
		await this.eventDispatcher.dispatch(KernelEvent.ServiceProviderRegistered, { name });
	}

	public async boot(name: string): Promise<void> {
		await this.get(name).boot();

		await this.eventDispatcher.dispatch(KernelEvent.ServiceProviderBooted, { name });

		this.#loadedProviders.add(name);
		this.#failedProviders.delete(name);
		this.#deferredProviders.delete(name);
	}

	public async dispose(name: string): Promise<void> {
		await this.get(name).dispose();

		await this.eventDispatcher.dispatch(KernelEvent.ServiceProviderDisposed, { name });

		this.#loadedProviders.delete(name);
		this.#failedProviders.delete(name);
		this.#deferredProviders.add(name);
	}
}
