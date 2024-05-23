import { JsonObject } from "type-fest";

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
	commitChanges(commitChanges: StateRepository): void;

	toJson(): JsonObject;
	fromJson(data: JsonObject): StateRepository;

	changesToJson(): StateRepositoryChange;
	applyChanges(changes: StateRepositoryChange): void;
}
