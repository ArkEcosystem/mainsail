import { Kernel } from "@arkecosystem/core-contracts";

import { DriverCannotBeResolved } from "../exceptions/container";
import { Identifiers, inject, injectable } from "../ioc";
import { pascalCase } from "../utils";

@injectable()
export abstract class InstanceManager<T> {
	@inject(Identifiers.Application)
	protected readonly app!: Kernel.Application;

	private defaultDriver: string;

	private drivers: Map<string, T> = new Map<string, T>();

	public constructor() {
		this.defaultDriver = this.getDefaultDriver();
	}

	public async boot(): Promise<void> {
		await this.createDriver(this.defaultDriver);
	}

	public driver(name?: string): T {
		name = name || this.defaultDriver;

		const driver: T | undefined = this.drivers.get(name);

		if (!driver) {
			throw new DriverCannotBeResolved(name);
		}

		return driver;
	}

	public async extend(name: string, callback: (app: Kernel.Application) => Promise<T>): Promise<void> {
		this.drivers.set(name, await callback(this.app));
	}

	public setDefaultDriver(name: string): void {
		this.defaultDriver = name;
	}

	public getDrivers(): T[] {
		return [...this.drivers.values()];
	}

	private async createDriver(name: string): Promise<void> {
		const creatorFunction = `create${pascalCase(name)}Driver`;

		if (typeof this[creatorFunction] !== "function") {
			throw new TypeError(`${name} driver is not supported by ${this.constructor.name}.`);
		}

		this.drivers.set(name, await this[creatorFunction](this.app));
	}

	protected abstract getDefaultDriver(): string;
}
