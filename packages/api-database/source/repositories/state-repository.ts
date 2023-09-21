import { IStateRepository, IStateRepositoryExtension, RepositoryDataSource } from "../contracts";
import { State } from "../models";
import { makeExtendedRepository } from "./repository-extension";

export const makeStateRepository = (dataSource: RepositoryDataSource): IStateRepository =>
	makeExtendedRepository<State, IStateRepositoryExtension>(State, dataSource, {
		// Add any extensions here
	});
