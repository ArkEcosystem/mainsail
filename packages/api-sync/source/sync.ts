import { Contracts as ApiDatabaseContracts, Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { performance } from "perf_hooks";

@injectable()
export class Sync implements Contracts.ApiSync.ISync {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(ApiDatabaseIdentifiers.DataSource)
	private readonly dataSource!: ApiDatabaseContracts.RepositoryDataSource;

	@inject(ApiDatabaseIdentifiers.BlockRepositoryFactory)
	private readonly blockRepositoryFactory!: ApiDatabaseContracts.IBlockRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.StateRepositoryFactory)
	private readonly stateRepositoryFactory!: ApiDatabaseContracts.IStateRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.TransactionRepositoryFactory)
	private readonly transactionRepositoryFactory!: ApiDatabaseContracts.ITransactionRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory)
	private readonly validatorRoundRepositoryFactory!: ApiDatabaseContracts.IValidatorRoundRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
	private readonly walletRepositoryFactory!: ApiDatabaseContracts.IWalletRepositoryFactory;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async onCommit(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<void> {
		const committedBlock = await unit.getCommittedBlock();

		const {
			block: { header, transactions },
			commit,
		} = committedBlock;

		const t0 = performance.now();

		await this.dataSource.transaction("REPEATABLE READ", async (entityManager) => {
			const blockRepository = this.blockRepositoryFactory(entityManager);
			const stateRepository = this.stateRepositoryFactory(entityManager);
			const transactionRepository = this.transactionRepositoryFactory(entityManager);
			const validatorRoundRepository = this.validatorRoundRepositoryFactory(entityManager);
			const walletRepository = this.walletRepositoryFactory(entityManager);

			await blockRepository.save({
				generatorPublicKey: header.generatorPublicKey,
				height: header.height,
				id: header.id,
				numberOfTransactions: header.numberOfTransactions,
				payloadHash: header.payloadHash,
				payloadLength: header.payloadLength,
				previousBlock: header.previousBlock,
				reward: header.reward.toFixed(),
				signature: commit.signature,
				timestamp: header.timestamp,
				totalAmount: header.totalAmount.toFixed(),
				totalFee: header.totalFee.toFixed(),
				version: header.version,
			});

			await stateRepository.upsert(
				{
					height: header.height,
					id: 1,
				},
				["id"],
			);

			await transactionRepository.save(
				transactions.map(({ data }) => ({
					amount: data.amount.toFixed(),
					asset: data.asset,
					blockHeight: header.height,
					blockId: header.id,
					fee: data.fee.toFixed(),
					id: data.id,
					nonce: data.nonce.toFixed(),
					recipientId: data.recipientId,
					senderPublicKey: data.senderPublicKey,
					sequence: data.sequence,
					signature: data.signature,
					timestamp: header.timestamp,
					type: data.type,
					typeGroup: data.typeGroup,
					vendorField: data.vendorField,
					version: data.version,
				})),
			);

			const { round, roundHeight } = Utils.roundCalculator.calculateRound(header.height, this.configuration);
			if (Utils.roundCalculator.isNewRound(header.height, this.configuration)) {
				await validatorRoundRepository
					.createQueryBuilder()
					.insert()
					.orIgnore()
					.values({
						round,
						roundHeight,
						validators: this.validatorSet
							.getActiveValidators()
							.map((validator) => validator.getWalletPublicKey()),
					})
					.execute();
			}

			const dirtyWallets = unit.getWalletRepository().getDirtyWallets();
			await walletRepository.upsert(
				dirtyWallets.map((holder) => {
					const wallet = holder.getWallet();
					return {
						address: wallet.getAddress(),
						attributes: wallet.getAttributes(),
						balance: wallet.getBalance().toFixed(),
						nonce: wallet.getNonce().toFixed(),
						publicKey: wallet.getPublicKey(),
					};
				}),
				["address"],
			);
		});

		const t1 = performance.now();

		this.logger.debug(`synced committed block: ${header.height} in ${t1 - t0}ms`);
	}
}
