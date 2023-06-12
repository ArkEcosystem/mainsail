import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services, Utils } from "@mainsail/kernel";

import { StateMachine } from "./state-machine";

@injectable()
export class ProcessBlocksJob implements Contracts.Kernel.QueueJob {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.StateMachine)
	private readonly stateMachine!: StateMachine;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	// @inject(Identifiers.Database.Service)
	// private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.PeerBroadcaster)
	private readonly broadcaster!: Contracts.P2P.Broadcaster;

	@inject(Identifiers.TriggerService)
	private readonly triggers!: Services.Triggers.Triggers;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	#blocks: Contracts.Crypto.IBlockData[] = [];

	public getBlocks(): Contracts.Crypto.IBlockData[] {
		return this.#blocks;
	}

	public setBlocks(blocks: Contracts.Crypto.IBlockData[]): void {
		this.#blocks = blocks;
	}

	public async handle(): Promise<void> {
		if (this.#blocks.length === 0) {
			return;
		}

		const lastHeight = this.blockchain.getLastBlock().data.height;
		const fromHeight = this.#blocks[0].height;
		// eslint-disable-next-line unicorn/prefer-at
		const toHeight = this.#blocks[this.#blocks.length - 1].height;
		this.logger.debug(
			`Processing chunk of blocks [${fromHeight.toLocaleString()}, ${toHeight.toLocaleString()}] on top of ${lastHeight.toLocaleString()}`,
		);

		if (!Utils.isBlockChained(this.blockchain.getLastBlock().data, this.#blocks[0])) {
			this.logger.warning(
				Utils.getBlockNotChainedErrorMessage(this.blockchain.getLastBlock().data, this.#blocks[0]),
			);
			// Discard remaining blocks as it won't go anywhere anyway.
			this.blockchain.clearQueue();
			this.blockchain.resetLastDownloadedBlock();
			return;
		}

		const acceptedBlocks: Contracts.Crypto.IBlock[] = [];
		let lastProcessResult: boolean | undefined;
		let lastProcessedBlock: Contracts.Crypto.IBlock | undefined;

		try {
			for (const block of this.#blocks) {
				const blockInstance = await this.blockFactory.fromData(block);
				Utils.assert.defined<Contracts.Crypto.IBlock>(blockInstance);

				lastProcessResult = await this.triggers.call("processBlock", {
					block: blockInstance,
					blockProcessor: this.app.get<Contracts.BlockProcessor.Processor>(Identifiers.BlockProcessor),
				});

				lastProcessedBlock = blockInstance;

				if (lastProcessResult === true) {
					acceptedBlocks.push(blockInstance);
				}
				// else if (lastProcessResult === Contracts.BlockProcessor.ProcessorResult.Corrupted) {
				// 	await this.#handleCorrupted();
				// 	return;
				// }
				else {
					break; // if one block is not accepted, the other ones won't be chained anyway
				}
			}
		} catch (error) {
			this.logger.error(
				`Failed to process chunk of block chunk of blocks [${fromHeight.toLocaleString()}, ${toHeight.toLocaleString()}] on top of ${lastHeight.toLocaleString()}`,
			);

			this.logger.error(error.stack);
		}

		if (acceptedBlocks.length > 0) {
			try {
				// TODO
				//await this.databaseService.saveBlocks(acceptedBlocks);
				// eslint-disable-next-line unicorn/prefer-at
				this.stateStore.setLastStoredBlockHeight(acceptedBlocks[acceptedBlocks.length - 1].data.height);
			} catch (error) {
				this.logger.error(
					`Could not save ${Utils.pluralize("block", acceptedBlocks.length, true)}) to database : ${error.stack
					}`,
				);

				throw error;
			}
		}

		if (!!lastProcessResult && lastProcessedBlock) {
			if (this.stateStore.isStarted() && this.stateMachine.getState() === "newBlock") {
				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				this.broadcaster.broadcastBlock(lastProcessedBlock);
			}
		} else {
			this.blockchain.clearQueue();
			this.blockchain.resetLastDownloadedBlock();
		}
	}

	// async #handleCorrupted() {
	// 	this.logger.error("Shutting down app, because state is corrupted");
	// 	// eslint-disable-next-line unicorn/no-process-exit
	// 	process.exit(1);
	// }
}
