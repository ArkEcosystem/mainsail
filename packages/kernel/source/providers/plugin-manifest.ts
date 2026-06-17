import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { get, has } from "@mainsail/utils";
import { createRequire } from "module";

@injectable()
export class PluginManifest {
	@inject(Identifiers.Services.Filesystem.Service)
	private readonly fileSystem!: Contracts.Kernel.Filesystem;

	#manifest!: Contracts.Types.JsonObject;

	public discover(packageId: string, url: string): this {
		this.#manifest = this.fileSystem.readJSONSync(createRequire(url).resolve(`${packageId}/package.json`));

		return this;
	}

	public get<T>(key: string, defaultValue?: T): T | undefined {
		return get(this.#manifest, key, defaultValue);
	}

	public getRequired<T>(key: string): T {
		const value = get(this.#manifest, key);
		if (value === undefined) {
			throw new Error(`Missing required manifest key: ${key}`);
		}

		return value as T;
	}

	public has(key: string): boolean {
		return has(this.#manifest, key);
	}

	public merge(manifest: Contracts.Types.JsonObject): this {
		this.#manifest = { ...this.#manifest, ...manifest };

		return this;
	}
}
