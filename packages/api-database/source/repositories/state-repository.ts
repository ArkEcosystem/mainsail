import { StateRepository, StateRepositoryExtension, RepositoryDataSource } from "../contracts";
import { State } from "../models";
import { makeExtendedRepository } from "./repository-extension";

export const makeStateRepository = (dataSource: RepositoryDataSource): StateRepository =>
	makeExtendedRepository<State, StateRepositoryExtension>(State, dataSource, {
		// Add any extensions here
	});
