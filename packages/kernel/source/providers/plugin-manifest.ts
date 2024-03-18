import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { get, has } from "@mainsail/utils";
import { createRequire } from "module";

@injectable()
export class PluginManifest {
	@inject(Identifiers.Services.Filesystem.Service)
	private readonly fileSystem!: Contracts.Kernel.Filesystem;

	#manifest!: Contracts.Types.JsonObject;

	public discover(packageId: string): this {
		this.#manifest = this.fileSystem.readJSONSync(
			createRequire(import.meta.url).resolve(`${packageId}/package.json`),
		);

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
