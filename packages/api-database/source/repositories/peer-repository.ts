import { PeerRepository, PeerRepositoryExtension, RepositoryDataSource } from "../contracts.js";
import { Peer } from "../models/peer.js";
import { PeerFilter } from "../search/filters/index.js";
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "../search/types/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makePeerRepository = (dataSource: RepositoryDataSource): PeerRepository =>
	makeExtendedRepository<Peer, PeerRepositoryExtension>(Peer, dataSource, {
		async findManyByCriteria(
			peerCriteria: Criteria.OrPeerCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Peer>> {
			const peerExpression = await PeerFilter.getExpression(peerCriteria);
			return this.listByExpression(peerExpression, sorting, pagination, options);
		},

		async getMedianPeerBlockNumber(): Promise<number> {
			const result = await this.createQueryBuilder()
				.select("percentile_cont(0.5) WITHIN GROUP (ORDER BY block_number)", "median_block_number")
				.getRawOne<{ median_block_number: number }>();

			return result?.median_block_number ?? 0;
		},
	});
