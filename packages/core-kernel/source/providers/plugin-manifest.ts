import { get, has } from "@arkecosystem/utils";

import { injectable } from "../ioc";
import { PackageJson } from "../types";

@injectable()
export class PluginManifest {
	private manifest!: PackageJson;

	public discover(packageId: string): this {
		this.manifest = require(`${packageId}/package.json`);

		return this;
	}

	public get<T>(key: string, defaultValue?: T): T {
		return get(this.manifest, key, defaultValue);
	}

	public has(key: string): boolean {
		return has(this.manifest, key);
	}

	public merge(manifest: PackageJson): this {
		this.manifest = { ...this.manifest, ...manifest };

		return this;
	}
}
