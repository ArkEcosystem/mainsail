import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { PluginManifest } from "./plugin-manifest.js";

@injectable()
export class ServiceProvider {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	#packageConfiguration!: Contracts.Kernel.PluginConfiguration;

	#packageManifest!: PluginManifest;

	public async boot(): Promise<void> {
		//
	}

	public async dispose(): Promise<void> {
		//
	}

	public manifest(): PluginManifest {
		return this.#packageManifest;
	}

	public setManifest(manifest: PluginManifest): void {
		this.#packageManifest = manifest;
	}

	public name(): string {
		return this.#packageManifest.getRequired<string>("name");
	}

	public version(): string {
		return this.#packageManifest.getRequired<string>("version");
	}

	public config(): Contracts.Kernel.PluginConfiguration {
		return this.#packageConfiguration;
	}

	public setConfig(config: Contracts.Kernel.PluginConfiguration): void {
		this.#packageConfiguration = config;
	}

	public configDefaults(): Contracts.Types.JsonObject {
		return {};
	}

	public configSchema(): object {
		return {};
	}

	public dependencies(): Contracts.Kernel.PluginDependency[] {
		return [];
	}

	public async bootWhen(serviceProvider?: string): Promise<boolean> {
		return true;
	}

	public async disposeWhen(serviceProvider?: string): Promise<boolean> {
		return false;
	}

	public async register(): Promise<void> {}
}
