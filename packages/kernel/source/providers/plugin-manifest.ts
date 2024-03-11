import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { get, has } from "@mainsail/utils";
import { readJSONSync } from "fs-extra/esm";

@injectable()
export class PluginManifest {
	#manifest!: Contracts.Types.JsonObject;

	public discover(packageId: string): this {
		this.#manifest = readJSONSync(`${packageId}/package.json`);

		return this;
	}

	public get<T>(key: string, defaultValue?: T): T {
		return get(this.#manifest, key, defaultValue)!;
	}

	public has(key: string): boolean {
		return has(this.#manifest, key);
	}

	public merge(manifest: Contracts.Types.JsonObject): this {
		this.#manifest = { ...this.#manifest, ...manifest };

		return this;
	}
}
