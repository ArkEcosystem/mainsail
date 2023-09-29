import { IPeerRepository, IPeerRepositoryExtension, RepositoryDataSource } from "../contracts";
import { Peer } from "../models/peer";
import { makeExtendedRepository } from "./repository-extension";

export const makePeerRepository = (dataSource: RepositoryDataSource): IPeerRepository =>
	makeExtendedRepository<Peer, IPeerRepositoryExtension>(Peer, dataSource, {
		async getMedianPeerHeight(): Promise<number> {
			const result = await this.createQueryBuilder()
				.select("percentile_cont(0.5) WITHIN GROUP (ORDER BY height)", "median_height")
				.getRawOne<{ median_height: number }>();

			return result?.median_height ?? 0;
		},
	});
