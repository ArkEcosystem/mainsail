import { IPeerRepository, RepositoryDataSource } from "../contracts";
import { Peer } from "../models/peer";

export const makePeerRepository = (dataSource: RepositoryDataSource): IPeerRepository =>
	dataSource.getRepository(Peer).extend({
		// Add any extensions here
	});
