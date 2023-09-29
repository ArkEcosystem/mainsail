import { IConfigurationRepository, IConfigurationRepositoryExtension, RepositoryDataSource } from "../contracts";
import { Configuration } from "../models";
import { makeExtendedRepository } from "./repository-extension";

export const makeConfigurationRepository = (dataSource: RepositoryDataSource): IConfigurationRepository =>
	makeExtendedRepository<Configuration, IConfigurationRepositoryExtension>(Configuration, dataSource, {
		// Add any extensions here
	});
