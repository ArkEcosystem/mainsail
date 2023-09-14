import { IStateRepository, RepositoryDataSource } from "../contracts";
import { State } from "../models";

export const makeStateRepository = (dataSource: RepositoryDataSource): IStateRepository =>
	dataSource.getRepository(State).extend({
		// Add any extensions here
	});
