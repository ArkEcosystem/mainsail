import { inject, injectable, postConstruct } from "@mainsail/container";
import { Constants, Contracts } from "@mainsail/contracts";
import { ensureFileSync, readJsonSync, writeJsonSync } from "fs-extra";

import { Application } from "../contracts";
import { Identifiers } from "../ioc";

@injectable()
export class Config {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Application;

	#file!: string;

	#store: object = {};

	@postConstruct()
	public initialize(): void {
		this.#file = this.app.getConsolePath("config", "config.json");

		this.restoreDefaults();

		this.load();
	}

	public all(): object {
		return this.#store;
	}

	public get<T>(key: string): T {
		return this.#store[key];
	}

	public set<T>(key: string, value: T): void {
		this.#store[key] = value;

		this.save();
	}

	public forget(key: string): void {
		delete this.#store[key];

		this.save();
	}

	public has(key: string): boolean {
		return Object.keys(this.#store).includes(key);
	}

	public load(): any {
		try {
			this.#store = readJsonSync(this.#file);
		} catch {
			this.restoreDefaults();

			this.load();
		}
	}

	public save(): void {
		ensureFileSync(this.#file);

		writeJsonSync(this.#file, this.#store);
	}

	public restoreDefaults(): void {
		if (this.#store.constructor !== Object) {
			this.#store = {};
		}

		if (!this.has("channel")) {
			this.set(
				"channel",
				this.#getRegistryChannel(this.app.get<Contracts.Types.PackageJson>(Identifiers.Package).version ?? ""),
			);
		}

		if (!this.has("plugins")) {
			this.set("plugins", []);
		}

		this.save();
	}

	#getRegistryChannel(version: string): string {
		let channel = "latest";
		for (const item of Constants.Channels) {
			if (version.includes(`-${item}`)) {
				channel = item;
			}
		}

		return channel;
	}
}
