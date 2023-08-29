import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Contracts as ApiDatabaseContracts } from "@mainsail/api-database";
import { Identifiers as ApiSyncIdentifiers } from "./identifiers";
import { makeBlockRepository } from "./repositories";
import { makeTransactionRepository } from "./repositories/transaction-repository";
import { performance } from "perf_hooks";

@injectable()
export class Sync implements Contracts.ApiSync.ISync {
    @inject(ApiSyncIdentifiers.DataSource)
    private readonly dataSource!: ApiDatabaseContracts.RepositoryDataSource;

    @inject(Identifiers.LogService)
    private readonly logger!: Contracts.Kernel.Logger;

    public async applyCommittedBlock(committedBlock: Contracts.Crypto.ICommittedBlock): Promise<void> {
        const { block: { header, transactions }, commit } = committedBlock;

        const t0 = performance.now();

        await this.dataSource.transaction("REPEATABLE READ", async (entityManager) => {
            const blockRepository = makeBlockRepository(entityManager);
            const transactionRepository = makeTransactionRepository(entityManager);

            await blockRepository.save({
                id: header.id,
                version: header.version,
                timestamp: header.timestamp,
                previousBlock: header.previousBlock,
                height: header.height,
                numberOfTransactions: header.numberOfTransactions,
                totalAmount: header.totalAmount.toFixed(),
                totalFee: header.totalFee.toFixed(),
                reward: header.reward.toFixed(),
                generatorPublicKey: header.generatorPublicKey,
                payloadHash: header.payloadHash,
                payloadLength: header.payloadLength,
                blockSignature: commit.signature,
            });

            await transactionRepository.save(transactions.map(({ data }) => ({
                id: data.id,
                version: data.version,
                type: data.type,
                typeGroup: data.typeGroup,

                blockId: header.id,
                blockHeight: header.height,
                timestamp: header.timestamp,
                sequence: data.sequence,
                nonce: data.nonce.toFixed(),
                senderPublicKey: data.senderPublicKey,
                recipientId: data.recipientId,
                vendorField: data.vendorField,
                amount: data.amount.toFixed(),
                fee: data.fee.toFixed(),
                // TODO: necessary?
                // serialized: data.serialized,
                asset: data.asset,
            })));

            // TODO: rounds, wallets, ...
        });

        const t1 = performance.now();

        this.logger.debug(`synced committed block: ${header.height} in ${t1 - t0}ms`);
    }
}