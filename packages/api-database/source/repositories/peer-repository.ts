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

		async getPeerBlockNumberP90(): Promise<number> {
			const result = await this.createQueryBuilder()
				.select("percentile_disc(0.9) WITHIN GROUP (ORDER BY block_number)", "p90")
				.getRawOne<{ p90: number }>();

			return result?.p90 ?? 0;
		},
	});
