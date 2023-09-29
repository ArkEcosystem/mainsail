import { IPluginRepository, IPluginRepositoryExtension, RepositoryDataSource } from "../contracts";
import { Plugin } from "../models";
import { makeExtendedRepository } from "./repository-extension";

export const makePluginRepository = (dataSource: RepositoryDataSource): IPluginRepository =>
	makeExtendedRepository<Plugin, IPluginRepositoryExtension>(Plugin, dataSource, {
	});
