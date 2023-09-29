import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	Models,
} from "@mainsail/api-database";
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

	@inject(ApiDatabaseIdentifiers.TransactionTypeRepositoryFactory)
	private readonly transactionTypeRepositoryFactory!: ApiDatabaseContracts.ITransactionTypeRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory)
	private readonly validatorRoundRepositoryFactory!: ApiDatabaseContracts.IValidatorRoundRepositoryFactory;

	@inject(ApiDatabaseIdentifiers.WalletRepositoryFactory)
	private readonly walletRepositoryFactory!: ApiDatabaseContracts.IWalletRepositoryFactory;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.TransactionHandlerRegistry)
	private readonly transactionHandlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async bootstrap(): Promise<void> {
		await this.#bootstrapTransactionTypes();
	}

	public async onCommit(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<void> {
		const committedBlock = await unit.getCommittedBlock();

		const {
			block: { header, transactions: blockTransactions },
			commit,
		} = committedBlock;

		const t0 = performance.now();

		await this.dataSource.transaction("REPEATABLE READ", async (entityManager) => {
			const blockRepository = this.blockRepositoryFactory(entityManager);
			const stateRepository = this.stateRepositoryFactory(entityManager);
			const transactionRepository = this.transactionRepositoryFactory(entityManager);
			const validatorRoundRepository = this.validatorRoundRepositoryFactory(entityManager);
			const walletRepository = this.walletRepositoryFactory(entityManager);

			const transactions: Models.Transaction[] = blockTransactions.map(transaction => this.#normalizeTransaction(header, transaction));

			await blockRepository.save({
				generatorPublicKey: header.generatorPublicKey,
				height: header.height.toFixed(),
				id: header.id,
				numberOfTransactions: header.numberOfTransactions,
				payloadHash: header.payloadHash,
				payloadLength: header.payloadLength,
				previousBlock: header.previousBlock,
				reward: header.reward.toFixed(),
				signature: commit.signature,
				timestamp: header.timestamp.toFixed(),
				totalAmount: header.totalAmount.toFixed(),
				totalFee: header.totalFee.toFixed(),
				totalMultiPaymentTransferred: transactions
					.reduce((sum, transaction) => sum.plus(transaction.totalMultiPaymentTransferred ?? Utils.BigNumber.ZERO), Utils.BigNumber.ZERO).toFixed(),
				version: header.version,
			});

			await stateRepository.upsert(
				{
					height: header.height,
					id: 1,
				},
				["id"],
			);

			await transactionRepository.save(transactions);

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

			const dirtyWallets = [...unit.getWalletRepository().getDirtyWallets()];
			await walletRepository.upsert(
				dirtyWallets.map((wallet) => ({
					address: wallet.getAddress(),
					attributes: wallet.getAttributes(),
					balance: wallet.getBalance().toFixed(),
					nonce: wallet.getNonce().toFixed(),
					publicKey: wallet.getPublicKey(),
				})),
				["address"],
			);
		});

		const t1 = performance.now();

		this.logger.debug(`synced committed block: ${header.height} in ${t1 - t0}ms`);
	}

	#normalizeTransaction(header: Contracts.Crypto.IBlockHeader, { data }: Contracts.Crypto.ITransaction): Models.Transaction {
		let totalMultiPaymentTransferred: string | undefined;
		if (data.typeGroup === Contracts.Crypto.TransactionTypeGroup.Core && data.type === Contracts.Crypto.TransactionType.MultiPayment) {
			totalMultiPaymentTransferred = data.asset!.payments!.reduce((sum, payment) => sum.plus(payment.amount), Utils.BigNumber.ZERO).toFixed();
		}

		return {
			amount: data.amount.toFixed(),
			blockHeight: header.height.toFixed(),
			blockId: header.id,
			fee: data.fee.toFixed(),
			id: data.id!,
			nonce: data.nonce.toFixed(),
			recipientId: data.recipientId,
			senderPublicKey: data.senderPublicKey,
			sequence: data.sequence!,
			signature: data.signature!,
			timestamp: header.timestamp.toFixed(),
			type: data.type,
			typeGroup: data.typeGroup,
			vendorField: data.vendorField,
			version: data.version,
			asset: data.asset,
			totalMultiPaymentTransferred,
		};
	}

	async #bootstrapTransactionTypes(): Promise<void> {
		const transactionHandlers = await this.transactionHandlerRegistry.getActivatedHandlers();

		const types: Models.TransactionType[] = [];

		for (const handler of transactionHandlers) {
			const constructor = handler.getConstructor();

			const type: number | undefined = constructor.type;
			const typeGroup: number | undefined = constructor.typeGroup;
			const version: number | undefined = constructor.version;
			const key: string | undefined = constructor.key;

			Utils.assert.defined<number>(type);
			Utils.assert.defined<number>(typeGroup);
			Utils.assert.defined<number>(version);
			Utils.assert.defined<string>(key);

			types.push({ key, schema: constructor.getSchema().properties, type, typeGroup, version });
		}

		types.sort((a, b) => {
			if (a.type !== b.type) {
				return a.type - b.type;
			}

			if (a.typeGroup !== b.typeGroup) {
				return a.typeGroup - b.typeGroup;
			}

			return a.version - b.version;
		});

		await this.transactionTypeRepositoryFactory().upsert(types, ["type", "typeGroup", "version"]);
	}
}
