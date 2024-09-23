import { AttributeRepository } from "./attributes.js";

export interface StateRepository {
	isChanged(): boolean;

	hasAttribute(key: string): boolean;
	getAttribute<T = any>(key: string, defaultValue?: T): T;
	getAttributes(): Record<string, any>;
	setAttribute<T = any>(key: string, value: T): void;
	forgetAttribute(key: string): void;

	isClone(): boolean;
	commitChanges(): void;
}

export interface StateRepositoryFactory {
	(
		attributeRepository: AttributeRepository,
		originalRepository?: StateRepository,
		initialData?: Record<string, unknown>,
	): StateRepository;
}
