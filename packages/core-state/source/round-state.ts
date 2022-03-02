import assert from "assert";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { DatabaseService } from "@arkecosystem/core-database";
import { Container, Enums, Services, Utils as AppUtils } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

@Container.injectable()
export class RoundState {
	@Container.inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@Container.inject(Identifiers.DatabaseService)
	private readonly databaseService!: DatabaseService;

	@Container.inject(Identifiers.DposState)
	@Container.tagged("state", "blockchain")
	private readonly dposState!: Contracts.State.DposState;

	@Container.inject(Identifiers.DposPreviousRoundStateProvider)
	private readonly getDposPreviousRoundState!: Contracts.State.DposPreviousRoundStateProvider;

	@Container.inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@Container.inject(Identifiers.WalletRepository)
	@Container.tagged("state", "blockchain")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	@Container.inject(Identifiers.TriggerService)
	private readonly triggers!: Services.Triggers.Triggers;

	@Container.inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@Container.inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@Container.inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Crypto.IConfiguration;

	@Container.inject(Identifiers.Cryptography.Identity.AddressFactory)
	private readonly addressFactory: Crypto.IAddressFactory;

	@Container.inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory: Crypto.IHashFactory;

	@Container.inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory: Crypto.IBlockFactory;

	@Container.inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: any;

	private blocksInCurrentRound: Crypto.IBlock[] = [];
	private forgingDelegates: Contracts.State.Wallet[] = [];

	public async applyBlock(block: Crypto.IBlock): Promise<void> {
		this.blocksInCurrentRound.push(block);

		await this.applyRound(block.data.height);
	}

	public async revertBlock(block: Crypto.IBlock): Promise<void> {
		if (this.blocksInCurrentRound.length === 0) {
			this.blocksInCurrentRound = await this.getBlocksForRound();
		}

		assert(
			// eslint-disable-next-line unicorn/prefer-at
			this.blocksInCurrentRound[this.blocksInCurrentRound.length - 1]!.data.id === block.data.id,
			`Last block in blocksInCurrentRound doesn't match block with id ${block.data.id}`,
		);

		await this.revertRound(block.data.height);
		this.blocksInCurrentRound.pop();
	}

	// TODO: Check if can restore from state
	public async restore(): Promise<void> {
		const block = this.stateStore.getLastBlock();
		const roundInfo = this.getRound(block.data.height);

		this.blocksInCurrentRound = await this.getBlocksForRound();

		await this.setForgingDelegatesOfRound(roundInfo);

		await this.databaseService.deleteRound(roundInfo.round + 1);

		await this.applyRound(block.data.height);
	}

	public async getActiveDelegates(
		roundInfo?: Contracts.Shared.RoundInfo,
		delegates?: Contracts.State.Wallet[],
	): Promise<Contracts.State.Wallet[]> {
		if (!roundInfo) {
			roundInfo = this.getRound();
		}

		if (
			this.forgingDelegates.length > 0 &&
			this.forgingDelegates[0].getAttribute<number>("delegate.round") === roundInfo.round
		) {
			return this.forgingDelegates;
		}

		// When called during applyRound we already know the delegates, so we don't have to query the database.
		if (!delegates) {
			const delegatesRound = await this.databaseService.getRound(roundInfo.round);

			for (const [index, { balance, publicKey }] of delegatesRound.entries()) {
				// ! find wallet by public key and clone it
				const wallet = this.walletRepository.createWallet(await this.addressFactory.fromPublicKey(publicKey));
				wallet.setPublicKey(publicKey);

				const delegate = {
					round: roundInfo.round,
					username: (await this.walletRepository.findByPublicKey(publicKey)).getAttribute(
						"delegate.username",
					),
					voteBalance: BigNumber.make(balance),
				};
				AppUtils.assert.defined(delegate.username);

				wallet.setAttribute("delegate", delegate);

				delegates[index] = wallet;
			}
		}

		// @TODO: why is delegates undefined here and blowing up
		return this.shuffleDelegates(roundInfo, delegates ?? []);
	}

	public async detectMissedBlocks(block: Crypto.IBlock): Promise<void> {
		const lastBlock: Crypto.IBlock = this.stateStore.getLastBlock();

		if (lastBlock.data.height === 1) {
			return;
		}

		const blockTimeLookup = await AppUtils.forgingInfoCalculator.getBlockTimeLookup(
			this.app,
			lastBlock.data.height,
			this.configuration,
		);

		const lastSlot: number = this.slots.getSlotNumber(blockTimeLookup, lastBlock.data.timestamp);
		const currentSlot: number = this.slots.getSlotNumber(blockTimeLookup, block.data.timestamp);

		const missedSlots: number = Math.min(currentSlot - lastSlot - 1, this.forgingDelegates.length);
		for (let index = 0; index < missedSlots; index++) {
			const missedSlot: number = lastSlot + index + 1;
			const delegate: Contracts.State.Wallet = this.forgingDelegates[missedSlot % this.forgingDelegates.length];

			this.logger.debug(
				`Delegate ${delegate.getAttribute(
					"delegate.username",
				)} (${delegate.getPublicKey()}) just missed a block.`,
			);

			this.events.dispatch(Enums.ForgerEvent.Missing, {
				delegate,
			});
		}
	}

	private async applyRound(height: number): Promise<void> {
		if (height === 1 || AppUtils.roundCalculator.isNewRound(height + 1, this.configuration)) {
			const roundInfo = this.getRound(height + 1);

			this.logger.info(`Starting Round ${roundInfo.round.toLocaleString()}`);

			await this.detectMissedRound();

			this.dposState.buildDelegateRanking();
			this.dposState.setDelegatesRound(roundInfo);

			await this.setForgingDelegatesOfRound(roundInfo, [...this.dposState.getRoundDelegates()]);

			await this.databaseService.saveRound(this.dposState.getRoundDelegates());

			this.blocksInCurrentRound = [];

			this.events.dispatch(Enums.RoundEvent.Applied);
		}
	}

	private async revertRound(height: number): Promise<void> {
		const roundInfo = this.getRound(height);
		const { round, nextRound } = roundInfo;

		if (nextRound === round + 1) {
			this.logger.info(`Back to previous round: ${round.toLocaleString()}`);

			await this.setForgingDelegatesOfRound(
				roundInfo,
				await this.calcPreviousActiveDelegates(roundInfo, this.blocksInCurrentRound),
			);

			await this.databaseService.deleteRound(nextRound);
		}
	}

	private async detectMissedRound(): Promise<void> {
		for (const delegate of this.forgingDelegates) {
			const isBlockProduced = this.blocksInCurrentRound.some(
				(blockGenerator) => blockGenerator.data.generatorPublicKey === delegate.getPublicKey(),
			);

			if (!isBlockProduced) {
				const wallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
					delegate.getPublicKey()!,
				);

				this.logger.debug(
					`Delegate ${wallet.getAttribute(
						"delegate.username",
					)} (${wallet.getPublicKey()}) just missed a round.`,
				);

				this.events.dispatch(Enums.RoundEvent.Missed, {
					delegate: wallet,
				});
			}
		}
	}

	private async getBlocksForRound(): Promise<Crypto.IBlock[]> {
		const lastBlock = this.stateStore.getLastBlock();
		const roundInfo = this.getRound(lastBlock.data.height);

		const maxBlocks = lastBlock.data.height - roundInfo.roundHeight + 1;

		let blocks = this.stateStore.getLastBlocksByHeight(
			roundInfo.roundHeight,
			roundInfo.roundHeight + maxBlocks - 1,
		);

		if (blocks.length !== maxBlocks) {
			blocks = [
				...(await this.databaseService.getBlocks(
					roundInfo.roundHeight,
					roundInfo.roundHeight + maxBlocks - blocks.length - 1,
				)),
				...blocks,
			];
		}

		assert(blocks.length === maxBlocks);

		for (let index = 0; index < blocks.length; index++) {
			// @ts-ignore
			blocks[index] = await this.blockFactory.fromData(blocks[index], { deserializeTransactionsUnchecked: true });
		}

		// @ts-ignore
		return blocks;
	}

	private async shuffleDelegates(
		roundInfo: Contracts.Shared.RoundInfo,
		delegates: Contracts.State.Wallet[],
	): Promise<Contracts.State.Wallet[]> {
		const seedSource: string = roundInfo.round.toString();
		// @TODO
		let currentSeed: Buffer = await this.hashFactory.sha256(Buffer.from(seedSource));

		delegates = delegates.map((delegate) => delegate.clone());
		for (let index = 0, delCount = delegates.length; index < delCount; index++) {
			for (let x = 0; x < 4 && index < delCount; index++, x++) {
				const newIndex = currentSeed[x] % delCount;
				const b = delegates[newIndex];
				delegates[newIndex] = delegates[index];
				delegates[index] = b;
			}
			currentSeed = await this.hashFactory.sha256(currentSeed);
		}

		return delegates;
	}

	private getRound(height?: number): Contracts.Shared.RoundInfo {
		if (!height) {
			height = this.stateStore.getLastBlock().data.height;
		}

		return AppUtils.roundCalculator.calculateRound(height, this.configuration);
	}

	private async setForgingDelegatesOfRound(
		roundInfo: Contracts.Shared.RoundInfo,
		delegates?: Contracts.State.Wallet[],
	): Promise<void> {
		// ! it's this.getActiveDelegates(roundInfo, delegates);
		// ! only last part of that function which reshuffles delegates is used
		const result = await this.triggers.call("getActiveDelegates", { delegates, roundInfo });
		this.forgingDelegates = (result as Contracts.State.Wallet[]) || [];
	}

	private async calcPreviousActiveDelegates(
		roundInfo: Contracts.Shared.RoundInfo,
		blocks: Crypto.IBlock[],
	): Promise<Contracts.State.Wallet[]> {
		const previousRoundState = await this.getDposPreviousRoundState(blocks, roundInfo);

		// TODO: Move to Dpos
		for (const previousRoundDelegateWallet of previousRoundState.getActiveDelegates()) {
			// ! name suggest that this is pure function
			// ! when in fact it is manipulating current wallet repository setting delegate ranks
			const username = previousRoundDelegateWallet.getAttribute("delegate.username");
			const delegateWallet = this.walletRepository.findByUsername(username);
			delegateWallet.setAttribute("delegate.rank", previousRoundDelegateWallet.getAttribute("delegate.rank"));
		}

		// ! return readonly array instead of taking slice
		return [...previousRoundState.getRoundDelegates()];
	}
}
