import { JsonObject } from "type-fest";

import { AttributeRepository } from "./attributes.js";

export interface StateRepositoryChange {
	set: {
		[key: string]: JsonObject;
	};
	forget: string[];
}

export interface StateRepository {
	isChanged(): boolean;

	hasAttribute(key: string): boolean;
	getAttribute<T = any>(key: string, defaultValue?: T): T;
	getAttributes(): Record<string, any>;
	setAttribute<T = any>(key: string, value: T): void;
	forgetAttribute(key: string): void;

	isClone(): boolean;
	commitChanges(): void;

	toJson(): JsonObject;
	fromJson(data: JsonObject): StateRepository;

	changesToJson(): StateRepositoryChange;
	applyChanges(changes: StateRepositoryChange): void;
}

export interface StateRepositoryFactory {
	(
		attributeRepository: AttributeRepository,
		originalRepository?: StateRepository,
		initialData?: Record<string, unknown>,
	): StateRepository;
}
