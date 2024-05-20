import { JsonObject } from "type-fest";

export interface RepositoryChange {
	set: {
		[key: string]: JsonObject;
	};
	forget: string[];
}

export interface Repository {
	isChanged(): boolean;

	hasAttribute(key: string): boolean;
	getAttribute<T = any>(key: string, defaultValue?: T): T;
	getAttributes(): Record<string, any>;
	setAttribute<T = any>(key: string, value: T): void;
	forgetAttribute(key: string): void;

	isClone(): boolean;
	commitChanges(commitChanges: Repository): void;

	toJson(): JsonObject;
	fromJson(data: JsonObject): Repository;

	changesToJson(): RepositoryChange;
	applyChanges(changes: RepositoryChange): void;
}
