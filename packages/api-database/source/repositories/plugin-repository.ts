import { PluginRepository, PluginRepositoryExtension, RepositoryDataSource } from "../contracts";
import { Plugin } from "../models";
import { makeExtendedRepository } from "./repository-extension";

export const makePluginRepository = (dataSource: RepositoryDataSource): PluginRepository =>
	makeExtendedRepository<Plugin, PluginRepositoryExtension>(Plugin, dataSource, {});
