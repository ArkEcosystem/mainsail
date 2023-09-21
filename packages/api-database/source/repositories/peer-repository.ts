import { IPeerRepository, IPeerRepositoryExtension, RepositoryDataSource } from "../contracts";
import { Peer } from "../models/peer";
import { makeExtendedRepository } from "./repository-extension";

export const makePeerRepository = (dataSource: RepositoryDataSource): IPeerRepository =>
	makeExtendedRepository<Peer, IPeerRepositoryExtension>(Peer, dataSource, {
		// Add any extensions here
	});
