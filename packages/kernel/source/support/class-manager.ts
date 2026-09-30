import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { pascalCase } from "@mainsail/utils";

@injectable()
export abstract class ClassManager {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	#defaultDriver: string;

	public constructor() {
		this.#defaultDriver = this.getDefaultDriver();
	}

	public async driver<T>(name?: string): Promise<T> {
		return this.#createDriver<T>(name || this.#defaultDriver);
	}

	public setDefaultDriver(name: string): void {
		this.#defaultDriver = name;
	}

	async #createDriver<T>(name: string): Promise<T> {
		const creatorFunction = `create${pascalCase(name)}Driver`;

		if (typeof this[creatorFunction] !== "function") {
			throw new TypeError(`${name} driver is not supported by ${this.constructor.name}.`);
		}

		return this[creatorFunction]();
	}

	protected abstract getDefaultDriver(): string;
}
