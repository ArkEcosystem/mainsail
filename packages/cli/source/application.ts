import { Contracts } from "@mainsail/contracts";
import { tmpdir } from "os";
// eslint-disable-next-line unicorn/import-style
import { resolve } from "path";

import { Paths } from "./contracts.js";
import { Identifiers } from "./ioc/index.js";

export class Application {
	public constructor(private readonly container: Contracts.Kernel.Container.Container) {
		this.container.bind(Identifiers.Application.Instance).toConstantValue(this);
	}

	public bind<T>(
		serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>,
	): Contracts.Kernel.Container.BindToFluentSyntax<T> {
		return this.container.bind(serviceIdentifier);
	}

	public rebind<T>(
		serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>,
	): Contracts.Kernel.Container.BindToFluentSyntax<T> {
		if (this.container.isBound(serviceIdentifier)) {
			this.container.unbindSync(serviceIdentifier);
		}

		return this.container.bind(serviceIdentifier);
	}

	public unbind<T>(serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>): void {
		return this.container.unbindSync(serviceIdentifier);
	}

	public get<T>(serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>): T {
		return this.container.get(serviceIdentifier);
	}

	public isBound<T>(serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>): boolean {
		return this.container.isBound(serviceIdentifier);
	}

	public resolve<T>(constructorFunction: Contracts.Kernel.Container.Newable<T>): T {
		return this.container.get(constructorFunction, { autobind: true });
	}

	public getCorePath(type: string, file?: string): string {
		const path: string = this.get<Paths>(Identifiers.ApplicationPaths)[type];

		return resolve(file ? `${path}/${file}` : path);
	}

	public getConsolePath(type: string, file?: string): string {
		const path: string = this.get<Paths>(Identifiers.ConsolePaths)[type];

		return resolve(file ? `${path}/${file}` : path);
	}

	public dataPath(): string {
		return tmpdir();
	}
}
