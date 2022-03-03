import { inject, injectable } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { get, has, set, unset } from "@arkecosystem/utils";
import deepmerge from "deepmerge";

import { ConfigRepository } from "../services/config";
import { JsonObject } from "../types";

// todo: review the implementation

@injectable()
export class PluginConfiguration {
	@inject(Identifiers.ConfigRepository)
	private readonly configRepository!: ConfigRepository;

	private items: JsonObject = {};

	public from(name: string, config: JsonObject): this {
		this.items = config;

		this.mergeWithGlobal(name);

		return this;
	}

	public discover(name: string, packageId: string): this {
		try {
			this.items = require(`${packageId}/distribution/defaults.js`).defaults;
		} catch {
			// Failed to discover the defaults configuration file. This can be intentional.
		}

		this.mergeWithGlobal(name);

		return this;
	}

	public merge(values: JsonObject | undefined): this {
		if (values) {
			this.items = deepmerge(this.items, values, {
				arrayMerge: (destination, source) => source,
			});
		}

		return this;
	}

	public all(): JsonObject {
		return this.items;
	}

	public get<T>(key: string, defaultValue?: T): T | undefined {
		if (typeof defaultValue !== "undefined") {
			throw new TypeError(`DEPRECATED get(${key}, ${defaultValue}), use getOptional instead`);
		}

		return get(this.items, key);
	}

	public getRequired<T>(key: string): T {
		if (!this.has(key)) {
			throw new Error(`Missing required ${key} configuration value`);
		}

		return get(this.items, key);
	}

	public getOptional<T>(key: string, defaultValue: T): T {
		if (!this.has(key)) {
			return defaultValue;
		}

		return get(this.items, key);
	}

	public set<T>(key: string, value: T): boolean {
		set(this.items, key, value);

		return this.has(key);
	}

	public unset<T>(key: string): boolean {
		unset(this.items, key);

		return this.has(key);
	}

	public has(key: string): boolean {
		return has(this.items, key);
	}

	private mergeWithGlobal(name: string): void {
		// @todo: better name for storing pluginOptions
		if (!this.configRepository.has(`app.pluginOptions.${name}`)) {
			return;
		}

		this.merge(this.configRepository.get(`app.pluginOptions.${name}`));
	}
}
