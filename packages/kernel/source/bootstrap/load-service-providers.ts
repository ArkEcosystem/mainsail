import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import path from "path";
import { URL } from "url";

import { PluginConfiguration, PluginManifest, ServiceProvider, ServiceProviderRepository } from "../providers/index.js";
import { ConfigRepository } from "../services/config/index.js";
import { assert } from "../utils/assert.js";

interface PluginEntry {
	package: string;
	options: Contracts.Types.JsonObject;
}

interface Plugin {
	path: string;
	name: string;
	version: string;
}

@injectable()
export class LoadServiceProviders implements Contracts.Kernel.Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Config.Repository)
	private readonly configRepository!: ConfigRepository;

	@inject(Identifiers.Services.Filesystem.Service)
	private readonly fileSystem!: Contracts.Kernel.Filesystem;

	@inject(Identifiers.ServiceProvider.Repository)
	private readonly serviceProviderRepository!: ServiceProviderRepository;

	public async bootstrap(): Promise<void> {
		const plugins: PluginEntry[] | undefined = this.configRepository.get<PluginEntry[]>("app.plugins");

		assert.defined<PluginEntry[]>(plugins);

		const installedPlugins = await this.#discoverPlugins(this.app.dataPath("plugins"));

		const pluginPath: string | undefined = this.app.config<string>("pluginPath", undefined, "");
		assert.string(pluginPath);

		for (const plugin of plugins) {
			const installedPlugin = installedPlugins.find((installedPlugin) => installedPlugin.name === plugin.package);
			const packageId = installedPlugin ? installedPlugin.path : plugin.package;

			let packageModule = path.join(pluginPath, packageId);

			let ServiceProvider;
			try {
				({ ServiceProvider } = await import(path.join(pluginPath, packageId)));
			} catch (error) {
				if (error.code === "ERR_MODULE_NOT_FOUND") {
					// HACK: just a workaround to use import on local packages if they are not installed.
					//
					// Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@mainsail/validation' imported from
					// ~/git/mainsail/packages/kernel/distribution/bootstrap/load-service-providers.js
					//
					const extractLocalModulePath = (message: string) => {
						const prefix = "Did you mean to import ";
						const suffix = "index.js";
						const startIndex = message.indexOf(prefix) + prefix.length;
						const endIndex = message.indexOf(suffix, startIndex) + suffix.length;
						const path = message.slice(startIndex, endIndex);
						const parts = path.split("/");
						return parts.slice(-3).join("/");
					};

					const localPath = extractLocalModulePath(error.stack);
					// ~/git/mainsail/packages/kernel/distribution/bootstrap
					// ~/git/mainsail/packages/
					// ~/git/mainsail/packages/validation/distribution/index.js
					const fallback = path.resolve(new URL(".", import.meta.url).pathname, "..", "..", "..", localPath);
					({ ServiceProvider } = await import(fallback));

					// ~/git/mainsail/packages/validation/distribution/index.js
					// ~/git/mainsail/packages/validation/
					packageModule = path.resolve(fallback.replaceAll("/index.js", ""), "..");
				}
			}

			if (!ServiceProvider) {
				throw new Exceptions.ServiceNotFound(packageId);
			}

			const serviceProvider: ServiceProvider = this.app.resolve(ServiceProvider);

			if (this.app.isWorker() && !serviceProvider.requiredByWorker()) {
				continue;
			}

			serviceProvider.setManifest(this.app.resolve(PluginManifest).discover(packageModule));
			serviceProvider.setConfig(
				await this.#discoverConfiguration(serviceProvider, plugin.options, packageModule),
			);

			this.serviceProviderRepository.set(plugin.package, serviceProvider);

			const alias: string | undefined = serviceProvider.alias();

			if (alias) {
				this.serviceProviderRepository.alias(plugin.package, alias);
			}
		}
	}

	async #discoverConfiguration(
		serviceProvider: ServiceProvider,
		options: Contracts.Types.JsonObject,
		packageId: string,
	): Promise<PluginConfiguration> {
		const serviceProviderName: string | undefined = serviceProvider.name();

		assert.defined<string>(serviceProviderName);

		const hasDefaults: boolean = Object.keys(serviceProvider.configDefaults()).length > 0;

		if (hasDefaults) {
			return this.app
				.resolve(PluginConfiguration)
				.from(serviceProviderName, serviceProvider.configDefaults())
				.merge(options);
		}

		const plugins = await this.app.resolve(PluginConfiguration).discover(serviceProviderName, packageId);
		return plugins.merge(options);
	}

	async #discoverPlugins(pluginPath: string): Promise<Plugin[]> {
		const plugins: Plugin[] = [];

		const glob = await import("glob");
		const packagePaths = glob
			.sync("{*/*/package.json,*/package.json}", { cwd: pluginPath })
			.map((packagePath) => path.join(pluginPath, packagePath).slice(0, -"/package.json".length));

		for (const packagePath of packagePaths) {
			const packageJson = this.fileSystem.readJSONSync<Plugin>(path.join(packagePath, "package.json"));

			plugins.push({
				name: packageJson.name,
				path: packagePath,
				version: packageJson.version,
			});
		}

		return plugins;
	}
}
