import type { JsonObject } from "../types/index.js";

export interface PluginConfiguration {
	from(name: string, config: JsonObject): PluginConfiguration;
	discover(name: string, packageId: string): Promise<PluginConfiguration>;
	merge(values: JsonObject | undefined): PluginConfiguration;
	all(): JsonObject;
	// get<T>(key: string, defaultValue?: T): T | undefined;
	getRequired<T>(key: string): T;
	getOptional<T>(key: string, defaultValue: T): T;
	has(key: string): boolean;
	set<T>(key: string, value: T): void;
	unset(key: string): void;
}
