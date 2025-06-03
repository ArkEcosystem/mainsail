import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Evm, JsCommitData, LogLevel } from "@mainsail/evm";
import { assert, ByteBuffer } from "@mainsail/utils";

@injectable()
export class EvmInstance implements Contracts.Evm.Instance, Contracts.Evm.Storage {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Commit.ProofSize)
	private readonly proofSize!: () => number;

	@inject(Identifiers.Cryptography.Block.HeaderSize)
	private readonly headerSize!: () => number;

	#evm!: Evm;

	@postConstruct()
	public initialize() {
		const logPrefix = `${this.constructor.name}`;

		this.#evm = new Evm({
			historySize: 256n,
			logger: (level: LogLevel, message: string) => {
				message = `(${logPrefix}) ${message}`;
				try {
					switch (level) {
						case LogLevel.Info: {
							this.logger.info(message);
							break;
						}
						case LogLevel.Debug: {
							this.logger.debug(message);
							break;
						}
						case LogLevel.Notice: {
							this.logger.notice(message);
							break;
						}
						case LogLevel.Emergency: {
							this.logger.emergency(message);
							break;
						}
						case LogLevel.Alert: {
							this.logger.alert(message);
							break;
						}
						case LogLevel.Critical: {
							this.logger.critical(message);
							break;
						}
						case LogLevel.Warning: {
							this.logger.warning(message);
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
	): Promise<Contracts.Evm.LegacyAttributes | null> {
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

	public async stateHash(commitKey: Contracts.Evm.CommitKey, currentHash: string): Promise<string> {
		return this.#evm.stateHash(commitKey, currentHash);
	}

	public async logsBloom(commitKey: Contracts.Evm.CommitKey): Promise<string> {
		return this.#evm.logsBloom(commitKey);
	}

	public async getState(): Promise<{ blockNumber: number; totalRound: number }> {
		const state = await this.#evm.getState();
		return { blockNumber: Number(state.blockNumber), totalRound: Number(state.totalRound) };
	}

	public async getBlockHeaderBytes(height: number): Promise<Buffer | undefined> {
		return this.#evm.getBlockHeaderBytes(BigInt(height));
	}

	public async getBlockNumberByHash(blockHash: string): Promise<number | undefined> {
		const result = await this.#evm.getBlockNumberByHash(blockHash);
		if (!result) {
			return undefined;
		}

		return Number(result);
	}

	public async getProofBytes(blockNumber: number): Promise<Buffer | undefined> {
		return this.#evm.getProofBytes(BigInt(blockNumber));
	}

	public async getTransactionBytes(key: string): Promise<Buffer | undefined> {
		return this.#evm.getTransactionBytes(key);
	}

	public async getTransactionKeyByHash(txHash: string): Promise<string | undefined> {
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

	async #prepareCommitData(unit: Contracts.Processor.ProcessableUnit): Promise<JsCommitData | undefined> {
		if (!("getCommit" in unit)) {
			return undefined;
		}

		const { block, serialized } = await unit.getCommit();

		const {
			header: { number: height, hash },
		} = block;

		const proofSize = this.proofSize();
		const headerSize = this.headerSize();

		const commitBuffer = Buffer.from(serialized.slice(0, (proofSize + headerSize) * 2), "hex");
		const proofBuffer = commitBuffer.subarray(0, proofSize);
		const blockBuffer = commitBuffer.subarray(proofSize, proofSize + headerSize);

		const transactionBuffers: Buffer[] = [];
		const transactionHashes: string[] = [];
		for (const transaction of block.transactions) {
			assert.number(transaction.data.transactionIndex);

			const buff = ByteBuffer.fromSize(transaction.serialized.length + 8);
			buff.writeUint32(height);
			buff.writeUint32(transaction.data.transactionIndex);
			buff.writeBytes(transaction.serialized);

			transactionBuffers.push(buff.toBuffer());
			transactionHashes.push(transaction.hash);
		}

		return {
			block: blockBuffer,
			blockHash: hash,
			proof: proofBuffer,
			transactionHashes,
			transactions: transactionBuffers,
		};
	}
}
