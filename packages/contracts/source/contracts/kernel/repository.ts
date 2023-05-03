import { JsonObject, KeyValuePair } from "../types";

export interface Repository {
	all(): JsonObject;

	get<T>(key: string, defaultValue?: T): T;

	set<T>(key: string, value: T): boolean;

	unset<T>(key: string): boolean;

	has<T>(key: string): boolean;

	hasAll<T>(keys: string[]): boolean;

	merge(items: KeyValuePair): void;
}
