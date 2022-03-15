import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { readJSONSync } from "fs-extra";
import glob from "glob";
import { join } from "path";

import { PluginConfiguration, PluginManifest, ServiceProvider, ServiceProviderRepository } from "../providers";
import { ConfigRepository } from "../services/config";
import { JsonObject } from "../types";
import { assert } from "../utils";
import { Bootstrapper } from "./interfaces";

interface PluginEntry {
	package: string;
	options: JsonObject;
}

interface Plugin {
	path: string;
	name: string;
	version: string;
}

@injectable()
export class LoadServiceProviders implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ConfigRepository)
	private readonly configRepository!: ConfigRepository;

	@inject(Identifiers.ServiceProviderRepository)
	private readonly serviceProviderRepository!: ServiceProviderRepository;

	public async bootstrap(): Promise<void> {
		const plugins: PluginEntry[] | undefined = this.configRepository.get<PluginEntry[]>("app.plugins");

		assert.defined<PluginEntry[]>(plugins);

		const installedPlugins = await this.#discoverPlugins(this.app.dataPath("plugins"));

		for (const plugin of plugins) {
			const installedPlugin = installedPlugins.find((installedPlugin) => installedPlugin.name === plugin.package);
			const packageId = installedPlugin ? installedPlugin.path : plugin.package;

			const serviceProvider: ServiceProvider = this.app.resolve(require(packageId).ServiceProvider);
			serviceProvider.setManifest(this.app.resolve(PluginManifest).discover(packageId));
			serviceProvider.setConfig(this.#discoverConfiguration(serviceProvider, plugin.options, packageId));

			this.serviceProviderRepository.set(plugin.package, serviceProvider);

			const alias: string | undefined = serviceProvider.alias();

			if (alias) {
				this.serviceProviderRepository.alias(plugin.package, alias);
			}
		}
	}

	#discoverConfiguration(
		serviceProvider: ServiceProvider,
		options: JsonObject,
		packageId: string,
	): PluginConfiguration {
		const serviceProviderName: string | undefined = serviceProvider.name();

		assert.defined<string>(serviceProviderName);

		const hasDefaults: boolean = Object.keys(serviceProvider.configDefaults()).length > 0;

		if (hasDefaults) {
			return this.app
				.resolve(PluginConfiguration)
				.from(serviceProviderName, serviceProvider.configDefaults())
				.merge(options);
		}

		return this.app.resolve(PluginConfiguration).discover(serviceProviderName, packageId).merge(options);
	}

	async #discoverPlugins(path: string): Promise<Plugin[]> {
		const plugins: Plugin[] = [];

		const packagePaths = glob
			.sync("{*/*/package.json,*/package.json}", { cwd: path })
			.map((packagePath) => join(path, packagePath).slice(0, -"/package.json".length));

		for (const packagePath of packagePaths) {
			const packageJson = readJSONSync(join(packagePath, "package.json"));

			plugins.push({
				name: packageJson.name,
				path: packagePath,
				version: packageJson.version,
			});
		}

		return plugins;
	}
}
