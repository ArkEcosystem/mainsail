import { ConfigurationRepository, ConfigurationRepositoryExtension, RepositoryDataSource } from "../contracts.js";
import { Configuration } from "../models/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeConfigurationRepository = (dataSource: RepositoryDataSource): ConfigurationRepository =>
	makeExtendedRepository<Configuration, ConfigurationRepositoryExtension>(Configuration, dataSource, {
		// Add any extensions here
	});
