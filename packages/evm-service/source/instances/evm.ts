import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Evm, JsCommitData, JsTransactionData, LogLevel } from "@mainsail/evm";
import { assert, validatorSetPack } from "@mainsail/utils";

@injectable()
export class EvmInstance implements Contracts.Evm.Instance, Contracts.Evm.Storage {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	#evm!: Evm;

	@postConstruct()
	public initialize() {
		this.#evm = new Evm({
			historySize: 256n,
			logger: (record) => {
				try {
					switch (record.level) {
						case LogLevel.Info: {
							this.logger.info(record.message, "evm");
							break;
						}
						case LogLevel.Debug: {
							this.logger.debug(record.message, "evm");
							break;
						}
						case LogLevel.Notice: {
							this.logger.notice(record.message, "evm");
							break;
						}
						case LogLevel.Alert: {
							this.logger.alert(record.message, "evm");
							break;
						}
						case LogLevel.Warn: {
							this.logger.warn(record.message, "evm");
							break;
						}
					}
				} catch {}
			},
			path: this.app.dataPath(),
		});
	}

	public async dispose(): Promise<void> {
		await this.#evm.dispose();
	}

	public async prepareNextCommit(context: Contracts.Evm.PrepareNextCommitContext): Promise<void> {
		return this.#evm.prepareNextCommit(context);
	}

	public async preverifyTransaction(
		txContext: Contracts.Evm.PreverifyTransactionContext,
	): Promise<Contracts.Evm.PreverifyTransactionResult> {
		return this.#evm.preverifyTransaction(txContext);
	}

	public async view(viewContext: Contracts.Evm.TransactionViewContext): Promise<Contracts.Evm.ViewResult> {
		return this.#evm.view(viewContext);
	}

	public async process(txContext: Contracts.Evm.TransactionContext): Promise<Contracts.Evm.ProcessResult> {
		return this.#evm.process(txContext);
	}

	public async simulate(txContext: Contracts.Evm.TransactionSimulateContext): Promise<Contracts.Evm.SimulateResult> {
		return this.#evm.simulate(txContext);
	}

	public async initializeGenesis(info: Contracts.Evm.GenesisInfo): Promise<void> {
		return this.#evm.initializeGenesis({
			account: info.account,
			deployerAccount: info.deployerAccount,
			initialBlockNumber: info.initialBlockNumber,
			initialSupply: info.initialSupply,
			usernameContract: info.usernameContract,
			validatorContract: info.validatorContract,
		});
	}

	public async getAccountInfo(address: string, blockNumber?: bigint): Promise<Contracts.Evm.AccountInfo> {
		return this.#evm.getAccountInfo(address, blockNumber);
	}

	public async getAccountInfoExtended(
		address: string,
		legacyAddress?: string,
	): Promise<Contracts.Evm.AccountInfoExtended> {
		return this.#evm.getAccountInfoExtended(address, legacyAddress);
	}

	public async importAccountInfos(infos: Contracts.Evm.AccountInfoExtended[]): Promise<void> {
		return this.#evm.importAccountInfos(infos);
	}

	public async importLegacyColdWallets(wallets: Contracts.Evm.ImportLegacyColdWallet[]): Promise<void> {
		return this.#evm.importLegacyColdWallets(wallets);
	}

	public async getAccounts(offset: bigint, limit: bigint): Promise<Contracts.Evm.GetAccountsResult> {
		return this.#evm.getAccounts(offset, limit);
	}

	public async getLegacyAttributes(
		address: string,
		legacyAddress?: string,
	): Promise<Contracts.Evm.LegacyAttributes | undefined | null> {
		return this.#evm.getLegacyAttributes(address, legacyAddress);
	}

	public async getLegacyColdWallets(
		offset: bigint,
		limit: bigint,
	): Promise<Contracts.Evm.GetLegacyColdWalletsResult> {
		return this.#evm.getLegacyColdWallets(offset, limit);
	}

	public async getReceipts(offset: bigint, limit: bigint): Promise<Contracts.Evm.GetReceiptsResult> {
		return this.#evm.getReceipts(offset, limit);
	}

	public async getReceiptsByBlockNumber(
		blockNumber: bigint,
	): Promise<Record<string, Contracts.Evm.TransactionReceipt>> {
		return this.#evm.getReceiptsByBlockNumber(blockNumber);
	}

	public async getReceipt(blockNumber: bigint, txHash: string): Promise<Contracts.Evm.GetReceiptResult> {
		return this.#evm.getReceipt(blockNumber, txHash);
	}

	public async updateRewardsAndVotes(context: Contracts.Evm.UpdateRewardsAndVotesContext): Promise<void> {
		return this.#evm.updateRewardsAndVotes(context);
	}

	public async calculateRoundValidators(context: Contracts.Evm.CalculateRoundValidatorsContext): Promise<void> {
		return this.#evm.calculateRoundValidators(context);
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const { number, round, hash } = unit.getBlock().header;
		const commitData = await this.#prepareCommitData(unit);

		const result = await this.#evm.commit(
			{ blockHash: hash, blockNumber: BigInt(number), round: BigInt(round) },
			commitData,
		);
		unit.setAccountUpdates(result.dirtyAccounts);
	}

	public async codeAt(address: string, blockNumber?: bigint): Promise<string> {
		return this.#evm.codeAt(address, blockNumber);
	}

	public async storageAt(address: string, slot: bigint): Promise<string> {
		return this.#evm.storageAt(address, slot);
	}

	public async stateRoot(commitKey: Contracts.Evm.CommitKey, currentHash: string): Promise<string> {
		return this.#evm.stateRoot(commitKey, currentHash);
	}

	public async logsBloom(commitKey: Contracts.Evm.CommitKey): Promise<string> {
		return this.#evm.logsBloom(commitKey);
	}

	public async getState(): Promise<{ blockNumber: number; totalRound: number }> {
		const state = await this.#evm.getState();
		return { blockNumber: Number(state.blockNumber), totalRound: Number(state.totalRound) };
	}

	public async getBlockHeaderData(
		blockNumber: number,
	): Promise<Contracts.Evm.BlockHeaderStorageData | undefined | null> {
		return this.#evm.getBlockHeaderData(BigInt(blockNumber));
	}

	public async getBlockNumberByHash(blockHash: string): Promise<number | undefined | null> {
		const result = await this.#evm.getBlockNumberByHash(blockHash);
		if (!result) {
			return undefined;
		}

		return Number(result);
	}

	public async getCommitData(blockNumber: number): Promise<Contracts.Evm.CommitStorageData | undefined | null> {
		const result = await this.#evm.getCommitData(BigInt(blockNumber));
		if (!result) {
			return undefined;
		}

		return result;
	}

	public async getTransactionData(key: string): Promise<Contracts.Evm.TransactionStorageData | undefined | null> {
		return this.#evm.getTransactionData(key);
	}

	public async getTransactionKeyByHash(txHash: string): Promise<string | undefined | null> {
		return this.#evm.getTransactionKeyByHash(txHash);
	}

	public async isEmpty(): Promise<boolean> {
		return this.#evm.isEmpty();
	}

	public async snapshot(commitKey: Contracts.Evm.CommitKey): Promise<void> {
		await this.#evm.snapshot(commitKey);
	}

	public async rollback(commitKey: Contracts.Evm.CommitKey): Promise<void> {
		await this.#evm.rollback(commitKey);
	}

	async #prepareCommitData(unit: Contracts.Processor.ProcessableUnit): Promise<JsCommitData | undefined | null> {
		if (!("getCommit" in unit)) {
			return undefined;
		}

		const { block, proof } = await unit.getCommit();

		const { header } = block;

		const transactions: JsTransactionData[] = [];

		for (const transaction of block.transactions) {
			assert.number(transaction.data.transactionIndex);
			assert.defined(transaction.data.r);
			assert.defined(transaction.data.s);
			assert.defined(transaction.data.v);

			transactions.push({
				data: Buffer.from(transaction.data.data, "hex"),
				blockNumber: header.number,
				from: transaction.data.from,
				gasLimit: BigInt(transaction.data.gasLimit),
				gasPrice: BigInt(transaction.data.gasPrice),
				index: transaction.data.transactionIndex,
				legacyAddress: transaction.data.senderLegacyAddress,
				legacySecondSignature: transaction.data.legacySecondSignature,
				nonce: transaction.data.nonce.toBigInt(),
				r: transaction.data.r,
				s: transaction.data.s,
				senderPublicKey: transaction.data.senderPublicKey,
				to: transaction.data.to,
				txHash: transaction.hash,
				v: transaction.data.v,
				value: transaction.data.value.toBigInt(),
			});
		}

		return {
			header: {
				hash: header.hash,
				logsBloom: header.logsBloom,
				fee: header.fee.toBigInt(),
				number: header.number,
				gasUsed: header.gasUsed,
				parentHash: header.parentHash,
				payloadSize: header.payloadSize,
				timestamp: BigInt(header.timestamp),
				proposer: header.proposer,
				version: header.version,
				reward: header.reward.toBigInt(),
				round: header.round,
				stateRoot: header.stateRoot,
				transactionsCount: header.transactionsCount,
				transactionsRoot: header.transactionsRoot,
			},
			proof: {
				round: proof.round,
				signature: proof.signature,
				validatorSet: validatorSetPack(proof.validators),
			},
			transactions,
		};
	}
}
