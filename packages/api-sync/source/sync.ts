import { Contracts as ApiDatabaseContracts } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { performance } from "perf_hooks";

import { Identifiers as ApiSyncIdentifiers } from "./identifiers";
import { makeBlockRepository } from "./repositories";
import { makeTransactionRepository } from "./repositories/transaction-repository";

@injectable()
export class Sync implements Contracts.ApiSync.ISync {
	@inject(ApiSyncIdentifiers.DataSource)
	private readonly dataSource!: ApiDatabaseContracts.RepositoryDataSource;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async applyCommittedBlock(committedBlock: Contracts.Crypto.ICommittedBlock): Promise<void> {
		const {
			block: { header, transactions },
			commit,
		} = committedBlock;

		const t0 = performance.now();

		await this.dataSource.transaction("REPEATABLE READ", async (entityManager) => {
			const blockRepository = makeBlockRepository(entityManager);
			const transactionRepository = makeTransactionRepository(entityManager);

			await blockRepository.save({
				blockSignature: commit.signature,
				generatorPublicKey: header.generatorPublicKey,
				height: header.height,
				id: header.id,
				numberOfTransactions: header.numberOfTransactions,
				payloadHash: header.payloadHash,
				payloadLength: header.payloadLength,
				previousBlock: header.previousBlock,
				reward: header.reward.toFixed(),
				timestamp: header.timestamp,
				totalAmount: header.totalAmount.toFixed(),
				totalFee: header.totalFee.toFixed(),
				version: header.version,
			});

			await transactionRepository.save(
				transactions.map(({ data }) => ({
					amount: data.amount.toFixed(),
					// TODO: necessary?
					// serialized: data.serialized,
					asset: data.asset,

					blockHeight: header.height,

					blockId: header.id,

					fee: data.fee.toFixed(),

					id: data.id,

					nonce: data.nonce.toFixed(),

					recipientId: data.recipientId,

					senderPublicKey: data.senderPublicKey,

					sequence: data.sequence,

					timestamp: header.timestamp,

					type: data.type,

					typeGroup: data.typeGroup,

					vendorField: data.vendorField,

					version: data.version,
				})),
			);

			// TODO: rounds, wallets, ...
		});

		const t1 = performance.now();

		this.logger.debug(`synced committed block: ${header.height} in ${t1 - t0}ms`);
	}
}
