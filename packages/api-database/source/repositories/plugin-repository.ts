import { PluginRepository, PluginRepositoryExtension, RepositoryDataSource } from "../contracts.js";
import { Plugin } from "../models/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makePluginRepository = (dataSource: RepositoryDataSource): PluginRepository =>
	makeExtendedRepository<Plugin, PluginRepositoryExtension>(Plugin, dataSource, {});
