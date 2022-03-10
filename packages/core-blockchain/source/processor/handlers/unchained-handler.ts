import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Services, Utils } from "@arkecosystem/core-kernel";

import { BlockHandler, BlockProcessorResult } from "../contracts";

enum UnchainedBlockStatus {
	NotReadyToAcceptNewHeight,
	AlreadyInBlockchain,
	EqualToLastBlock,
	GeneratorMismatch,
	DoubleForging,
	InvalidTimestamp,
}

@injectable()
export class UnchainedHandler implements BlockHandler {
	@inject(Identifiers.BlockchainService)
	protected readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.TriggerService)
	private readonly triggers!: Services.Triggers.Triggers;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	private isValidGenerator = false;

	// todo: remove the need for this method
	public initialize(isValidGenerator: boolean): this {
		this.isValidGenerator = isValidGenerator;

		return this;
	}

	public async execute(block: Contracts.Crypto.IBlock): Promise<BlockProcessorResult> {
		this.blockchain.resetLastDownloadedBlock();

		this.blockchain.clearQueue();

		const status: UnchainedBlockStatus = this.checkUnchainedBlock(block);

		switch (status) {
			case UnchainedBlockStatus.DoubleForging: {
				const roundInfo: Contracts.Shared.RoundInfo = Utils.roundCalculator.calculateRound(
					block.data.height,
					this.configuration,
				);

				const validators: Contracts.State.Wallet[] = await this.triggers.call("getActiveValidators", {
					roundInfo,
				});

				if (validators.some((validator) => validator.getPublicKey() === block.data.generatorPublicKey)) {
					return BlockProcessorResult.Rollback;
				}

				return BlockProcessorResult.Rejected;
			}

			case UnchainedBlockStatus.NotReadyToAcceptNewHeight:
			case UnchainedBlockStatus.GeneratorMismatch:
			case UnchainedBlockStatus.InvalidTimestamp: {
				return BlockProcessorResult.Rejected;
			}

			default: {
				return BlockProcessorResult.DiscardedButCanBeBroadcasted;
			}
		}
	}

	private checkUnchainedBlock(block: Contracts.Crypto.IBlock): UnchainedBlockStatus {
		const lastBlock: Contracts.Crypto.IBlock = this.blockchain.getLastBlock();

		// todo: clean up this if-else-if-else-if-else mess
		if (block.data.height > lastBlock.data.height + 1) {
			this.logger.debug(
				`Blockchain not ready to accept new block at height ${block.data.height.toLocaleString()}. Last block: ${lastBlock.data.height.toLocaleString()}`,
			);

			return UnchainedBlockStatus.NotReadyToAcceptNewHeight;
		} else if (block.data.height < lastBlock.data.height) {
			this.logger.debug(`Block ${block.data.height.toLocaleString()} disregarded because already in blockchain`);

			return UnchainedBlockStatus.AlreadyInBlockchain;
		} else if (block.data.height === lastBlock.data.height && block.data.id === lastBlock.data.id) {
			this.logger.debug(`Block ${block.data.height.toLocaleString()} just received`);

			return UnchainedBlockStatus.EqualToLastBlock;
		} else if (block.data.timestamp < lastBlock.data.timestamp) {
			this.logger.debug(
				`Block ${block.data.height.toLocaleString()} disregarded, because the timestamp is lower than the previous timestamp.`,
			);
			return UnchainedBlockStatus.InvalidTimestamp;
		} else {
			if (this.isValidGenerator) {
				this.logger.warning(`Detect double forging by ${block.data.generatorPublicKey}`);
				return UnchainedBlockStatus.DoubleForging;
			}

			this.logger.info(
				`Forked block disregarded because it is not allowed to be forged. Caused by validator: ${block.data.generatorPublicKey}`,
			);

			return UnchainedBlockStatus.GeneratorMismatch;
		}
	}
}
