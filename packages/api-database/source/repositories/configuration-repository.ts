import { ConfigurationRepository, ConfigurationRepositoryExtension, RepositoryDataSource } from "../contracts";
import { Configuration } from "../models";
import { makeExtendedRepository } from "./repository-extension";

export const makeConfigurationRepository = (dataSource: RepositoryDataSource): ConfigurationRepository =>
	makeExtendedRepository<Configuration, ConfigurationRepositoryExtension>(Configuration, dataSource, {
		// Add any extensions here
	});
