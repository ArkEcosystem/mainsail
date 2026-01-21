import type { Container } from "../kernel/index.js";

export interface Application {
	bind<T>(serviceIdentifier: Container.ServiceIdentifier<T>): Container.BindToFluentSyntax<T>;
	rebind<T>(serviceIdentifier: Container.ServiceIdentifier<T>): Container.BindToFluentSyntax<T>;
	unbind<T>(serviceIdentifier: Container.ServiceIdentifier<T>): void;
	get<T>(serviceIdentifier: Container.ServiceIdentifier<T>): T;
	isBound<T>(serviceIdentifier: Container.ServiceIdentifier<T>): boolean;
	resolve<T>(constructorFunction: Container.Newable<T>): T;
	getCorePath(type: string, file?: string): string;
	getConsolePath(type: string, file?: string): string;
}
