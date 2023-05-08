import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { PluginConfiguration } from "./plugin-configuration";
import { PluginManifest } from "./plugin-manifest";

@injectable()
export abstract class ServiceProvider {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	#packageConfiguration!: PluginConfiguration;

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

	public name(): string | undefined {
		if (this.#packageManifest) {
			return this.#packageManifest.get("name");
		}

		return undefined;
	}

	public version(): string | undefined {
		if (this.#packageManifest) {
			return this.#packageManifest.get("version");
		}

		return undefined;
	}

	public alias(): string | undefined {
		if (this.#packageManifest) {
			return this.#packageManifest.get("arkecosystem.core.alias");
		}

		return undefined;
	}

	public config(): PluginConfiguration {
		return this.#packageConfiguration;
	}

	public setConfig(config: PluginConfiguration): void {
		this.#packageConfiguration = config;
	}

	public configDefaults(): Contracts.Types.JsonObject {
		return {};
	}

	public configSchema(): object {
		return {};
	}

	public dependencies(): Contracts.Kernel.PluginDependency[] {
		if (this.#packageManifest) {
			return this.#packageManifest.get("arkecosystem.core.dependencies", []);
		}

		return [];
	}

	public async bootWhen(serviceProvider?: string): Promise<boolean> {
		return true;
	}

	public async disposeWhen(serviceProvider?: string): Promise<boolean> {
		return false;
	}

	public async required(): Promise<boolean> {
		if (this.#packageManifest) {
			return this.#packageManifest.get("arkecosystem.core.required", false);
		}

		return false;
	}

	public abstract register(): Promise<void>;
}
