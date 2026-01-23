import type { Contracts } from "@mainsail/contracts";

import { Container } from "./ioc.js";

export class Application {
	#container: Contracts.Kernel.Container.Container;

	public constructor() {
		this.#container = new Container();
	}

	public bind<T>(
		serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>,
	): Contracts.Kernel.Container.BindToFluentSyntax<T> {
		return this.#container.bind(serviceIdentifier);
	}

	public rebind<T>(
		serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>,
	): Contracts.Kernel.Container.BindToFluentSyntax<T> {
		if (this.#container.isBound(serviceIdentifier)) {
			this.#container.unbindSync(serviceIdentifier);
		}

		return this.#container.bind(serviceIdentifier);
	}

	public unbind<T>(serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>): void {
		return this.#container.unbindSync(serviceIdentifier);
	}

	public get<T>(serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>): T {
		return this.#container.get(serviceIdentifier);
	}

	public getTagged<T>(
		serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>,
		key: string | number | symbol,
		value: string,
	): T {
		return this.#container.get(serviceIdentifier, { tag: { key, value } });
	}

	public isBound<T>(serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>): boolean {
		return this.#container.isBound(serviceIdentifier);
	}

	public isBoundTagged<T>(
		serviceIdentifier: Contracts.Kernel.Container.ServiceIdentifier<T>,
		key: string | number | symbol,
		value: string,
	): boolean {
		return this.#container.isBound(serviceIdentifier, { tag: { key, value } });
	}

	public resolve<T>(constructorFunction: Contracts.Kernel.Container.Newable<T>): T {
		return this.#container.get(constructorFunction, { autobind: true });
	}
}
