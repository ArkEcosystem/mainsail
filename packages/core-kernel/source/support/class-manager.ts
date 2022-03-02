import { Kernel } from "@arkecosystem/core-contracts";

import { Identifiers, inject, injectable } from "../ioc";
// todo: revisit the implementation of the class and see if it can be removed
// import { Class } from "../types";
import { pascalCase } from "../utils";

@injectable()
export abstract class ClassManager {
	@inject(Identifiers.Application)
	protected readonly app!: Kernel.Application;

	private defaultDriver: string;

	// todo: revisit the implementation of the class and see if it can be removed
	//
	// private drivers: Map<string, Class> = new Map<string, Class>();

	public constructor() {
		this.defaultDriver = this.getDefaultDriver();
	}

	public async driver<T>(name?: string): Promise<T> {
		return this.createDriver<T>(name || this.defaultDriver);
	}

	// todo: revisit the implementation of the class and see if it can be removed
	//
	// public async extend(name: string, driver: Class): Promise<void> {
	//     this.drivers.set(name, driver);
	// }

	public setDefaultDriver(name: string): void {
		this.defaultDriver = name;
	}

	// todo: revisit the implementation of the class and see if it can be removed
	//
	// public getDrivers(): Class[] {
	//     return Object.values(this.drivers);
	// }

	private async createDriver<T>(name: string): Promise<T> {
		const creatorFunction = `create${pascalCase(name)}Driver`;

		if (typeof this[creatorFunction] !== "function") {
			throw new TypeError(`${name} driver is not supported by ${this.constructor.name}.`);
		}

		return this[creatorFunction]();
	}

	protected abstract getDefaultDriver(): string;
}
