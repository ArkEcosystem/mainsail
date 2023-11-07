import { IPeerRepository, IPeerRepositoryExtension, RepositoryDataSource } from "../contracts";
import { Peer } from "../models/peer";
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "../search";
import { PeerFilter } from "../search/filters";
import { makeExtendedRepository } from "./repository-extension";

export const makePeerRepository = (dataSource: RepositoryDataSource): IPeerRepository =>
	makeExtendedRepository<Peer, IPeerRepositoryExtension>(Peer, dataSource, {
		async findManyByCriteria(
			peerCriteria: Criteria.OrPeerCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Peer>> {
			const peerExpression = await PeerFilter.getExpression(peerCriteria);
			return this.listByExpression(peerExpression, sorting, pagination, options);

		},

		async getMedianPeerHeight(): Promise<number> {
			const result = await this.createQueryBuilder()
				.select("percentile_cont(0.5) WITHIN GROUP (ORDER BY height)", "median_height")
				.getRawOne<{ median_height: number }>();

			return result?.median_height ?? 0;
		}
	});
