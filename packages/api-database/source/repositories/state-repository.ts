import { RepositoryDataSource, StateRepository, StateRepositoryExtension } from "../contracts.js";
import { State } from "../models/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeStateRepository = (dataSource: RepositoryDataSource): StateRepository =>
	makeExtendedRepository<State, StateRepositoryExtension>(State, dataSource, {
		// Add any extensions here
	});
