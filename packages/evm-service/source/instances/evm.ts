import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Evm, JsCommitData, LogLevel } from "@mainsail/evm";
import { assert, ByteBuffer } from "@mainsail/utils";

@injectable()
export abstract class EvmInstance implements Contracts.Evm.Instance, Contracts.Evm.Storage {
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
				message = `[${logPrefix}] ${message}`;
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
			initialHeight: info.initialHeight,
			initialSupply: info.initialSupply,
			usernameContract: info.usernameContract,
			validatorContract: info.validatorContract,
		});
	}

	public async getAccountInfo(address: string, height?: bigint): Promise<Contracts.Evm.AccountInfo> {
		return this.#evm.getAccountInfo(address, height);
	}

	public async getAccountInfoExtended(
		address: string,
		legacyAddress?: string,
	): Promise<Contracts.Evm.AccountInfoExtended> {
		return this.#evm.getAccountInfoExtended(address, legacyAddress);
	}

	public async importAccountInfo(info: Contracts.Evm.AccountInfoExtended): Promise<void> {
		return this.#evm.importAccountInfo(info);
	}

	public async importLegacyColdWallet(wallet: Contracts.Evm.ImportLegacyColdWallet): Promise<void> {
		return this.#evm.importLegacyColdWallet({ ...wallet, mergeInfo: undefined });
	}

	public async getAccounts(offset: bigint, limit: bigint): Promise<Contracts.Evm.GetAccountsResult> {
		return this.#evm.getAccounts(offset, limit);
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

	public async getReceipt(height: bigint, txHash: string): Promise<Contracts.Evm.GetReceiptResult> {
		return this.#evm.getReceipt(height, txHash);
	}

	public async updateRewardsAndVotes(context: Contracts.Evm.UpdateRewardsAndVotesContext): Promise<void> {
		return this.#evm.updateRewardsAndVotes(context);
	}

	public async calculateActiveValidators(context: Contracts.Evm.CalculateActiveValidatorsContext): Promise<void> {
		return this.#evm.calculateActiveValidators(context);
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const { height, round } = unit.getBlock().data;
		const commitData = await this.#prepareCommitData(unit);

		const result = await this.#evm.commit({ height: BigInt(height), round: BigInt(round) }, commitData);
		unit.setAccountUpdates(result.dirtyAccounts);
	}

	public async codeAt(address: string, height?: bigint): Promise<string> {
		return this.#evm.codeAt(address, height);
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

	public async getState(): Promise<{ height: number; totalRound: number }> {
		const state = await this.#evm.getState();
		return { height: Number(state.height), totalRound: Number(state.totalRound) };
	}

	public async getBlockHeaderBytes(height: number): Promise<Buffer | undefined> {
		return this.#evm.getBlockHeaderBytes(BigInt(height));
	}

	public async getBlockHeightById(id: string): Promise<number | undefined> {
		const result = await this.#evm.getBlockHeightById(id);
		if (!result) {
			return undefined;
		}

		return Number(result);
	}

	public async getProofBytes(height: number): Promise<Buffer | undefined> {
		return this.#evm.getProofBytes(BigInt(height));
	}

	public async getTransactionBytes(key: string): Promise<Buffer | undefined> {
		return this.#evm.getTransactionBytes(key);
	}

	public async getTransactionKeyById(id: string): Promise<string | undefined> {
		return this.#evm.getTransactionKeyById(id);
	}

	public async isEmpty(): Promise<boolean> {
		return this.#evm.isEmpty();
	}

	async #prepareCommitData(unit: Contracts.Processor.ProcessableUnit): Promise<JsCommitData | undefined> {
		if (!("getCommit" in unit)) {
			return undefined;
		}

		const { block, serialized } = await unit.getCommit();

		const {
			header: { height, id },
		} = block;

		const proofSize = this.proofSize();
		const headerSize = this.headerSize();

		const commitBuffer = Buffer.from(serialized.slice(0, (proofSize + headerSize) * 2), "hex");
		const proofBuffer = commitBuffer.subarray(0, proofSize);
		const blockBuffer = commitBuffer.subarray(proofSize, proofSize + headerSize);

		const transactionBuffers: Buffer[] = [];
		const transactionIds: string[] = [];
		for (const transaction of block.transactions) {
			assert.number(transaction.data.sequence);

			const buff = ByteBuffer.fromSize(transaction.serialized.length + 8);
			buff.writeUint32(height);
			buff.writeUint32(transaction.data.sequence);
			buff.writeBytes(transaction.serialized);

			transactionBuffers.push(buff.toBuffer());
			transactionIds.push(transaction.id);
		}

		return {
			block: blockBuffer,
			blockId: id,
			proof: proofBuffer,
			transactionIds,
			transactions: transactionBuffers,
		};
	}
}
