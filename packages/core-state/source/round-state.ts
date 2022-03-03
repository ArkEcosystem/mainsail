import { inject, injectable, tagged } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { DatabaseService } from "@arkecosystem/core-database";
import { Enums, Services, Utils as AppUtils } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";
import assert from "assert";

@injectable()
export class RoundState {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.DatabaseService)
	private readonly databaseService!: DatabaseService;

	@inject(Identifiers.DposState)
	@tagged("state", "blockchain")
	private readonly dposState!: Contracts.State.DposState;

	@inject(Identifiers.DposPreviousRoundStateProvider)
	private readonly getDposPreviousRoundState!: Contracts.State.DposPreviousRoundStateProvider;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.TriggerService)
	private readonly triggers!: Services.Triggers.Triggers;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	private readonly addressFactory: Contracts.Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory: Contracts.Crypto.IHashFactory;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: any;

	private blocksInCurrentRound: Contracts.Crypto.IBlock[] = [];
	private forgingValidators: Contracts.State.Wallet[] = [];

	public async applyBlock(block: Contracts.Crypto.IBlock): Promise<void> {
		this.blocksInCurrentRound.push(block);

		await this.applyRound(block.data.height);
	}

	public async revertBlock(block: Contracts.Crypto.IBlock): Promise<void> {
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

		await this.setForgingValidatorsOfRound(roundInfo);

		await this.databaseService.deleteRound(roundInfo.round + 1);

		await this.applyRound(block.data.height);
	}

	public async getActiveValidators(
		roundInfo?: Contracts.Shared.RoundInfo,
		validators?: Contracts.State.Wallet[],
	): Promise<Contracts.State.Wallet[]> {
		if (!roundInfo) {
			roundInfo = this.getRound();
		}

		if (
			this.forgingValidators.length > 0 &&
			this.forgingValidators[0].getAttribute<number>("validator.round") === roundInfo.round
		) {
			return this.forgingValidators;
		}

		// When called during applyRound we already know the validators, so we don't have to query the database.
		if (!validators) {
			const validatorsRound = await this.databaseService.getRound(roundInfo.round);

			for (const [index, { balance, publicKey }] of validatorsRound.entries()) {
				// ! find wallet by public key and clone it
				const wallet = this.walletRepository.createWallet(await this.addressFactory.fromPublicKey(publicKey));
				wallet.setPublicKey(publicKey);

				const validator = {
					round: roundInfo.round,
					username: (await this.walletRepository.findByPublicKey(publicKey)).getAttribute(
						"validator.username",
					),
					voteBalance: BigNumber.make(balance),
				};
				AppUtils.assert.defined(validator.username);

				wallet.setAttribute("validator", validator);

				validators[index] = wallet;
			}
		}

		// @TODO: why is validators undefined here and blowing up
		return this.shuffleValidators(roundInfo, validators ?? []);
	}

	public async detectMissedBlocks(block: Contracts.Crypto.IBlock): Promise<void> {
		const lastBlock: Contracts.Crypto.IBlock = this.stateStore.getLastBlock();

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

		const missedSlots: number = Math.min(currentSlot - lastSlot - 1, this.forgingValidators.length);
		for (let index = 0; index < missedSlots; index++) {
			const missedSlot: number = lastSlot + index + 1;
			const validator: Contracts.State.Wallet =
				this.forgingValidators[missedSlot % this.forgingValidators.length];

			this.logger.debug(
				`Validator ${validator.getAttribute(
					"validator.username",
				)} (${validator.getPublicKey()}) just missed a block.`,
			);

			this.events.dispatch(Enums.ForgerEvent.Missing, {
				validator,
			});
		}
	}

	private async applyRound(height: number): Promise<void> {
		if (height === 1 || AppUtils.roundCalculator.isNewRound(height + 1, this.configuration)) {
			const roundInfo = this.getRound(height + 1);

			this.logger.info(`Starting Round ${roundInfo.round.toLocaleString()}`);

			await this.detectMissedRound();

			this.dposState.buildValidatorRanking();
			this.dposState.setValidatorsRound(roundInfo);

			await this.setForgingValidatorsOfRound(roundInfo, [...this.dposState.getRoundValidators()]);

			await this.databaseService.saveRound(this.dposState.getRoundValidators());

			this.blocksInCurrentRound = [];

			this.events.dispatch(Enums.RoundEvent.Applied);
		}
	}

	private async revertRound(height: number): Promise<void> {
		const roundInfo = this.getRound(height);
		const { round, nextRound } = roundInfo;

		if (nextRound === round + 1) {
			this.logger.info(`Back to previous round: ${round.toLocaleString()}`);

			await this.setForgingValidatorsOfRound(
				roundInfo,
				await this.calcPreviousActiveValidators(roundInfo, this.blocksInCurrentRound),
			);

			await this.databaseService.deleteRound(nextRound);
		}
	}

	private async detectMissedRound(): Promise<void> {
		for (const validator of this.forgingValidators) {
			const isBlockProduced = this.blocksInCurrentRound.some(
				(blockGenerator) => blockGenerator.data.generatorPublicKey === validator.getPublicKey(),
			);

			if (!isBlockProduced) {
				const wallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
					validator.getPublicKey()!,
				);

				this.logger.debug(
					`Validator ${wallet.getAttribute(
						"validator.username",
					)} (${wallet.getPublicKey()}) just missed a round.`,
				);

				this.events.dispatch(Enums.RoundEvent.Missed, {
					validator: wallet,
				});
			}
		}
	}

	private async getBlocksForRound(): Promise<Contracts.Crypto.IBlock[]> {
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

	private async shuffleValidators(
		roundInfo: Contracts.Shared.RoundInfo,
		validators: Contracts.State.Wallet[],
	): Promise<Contracts.State.Wallet[]> {
		const seedSource: string = roundInfo.round.toString();
		// @TODO
		let currentSeed: Buffer = await this.hashFactory.sha256(Buffer.from(seedSource));

		validators = validators.map((validator) => validator.clone());
		for (let index = 0, delCount = validators.length; index < delCount; index++) {
			for (let x = 0; x < 4 && index < delCount; index++, x++) {
				const newIndex = currentSeed[x] % delCount;
				const b = validators[newIndex];
				validators[newIndex] = validators[index];
				validators[index] = b;
			}
			currentSeed = await this.hashFactory.sha256(currentSeed);
		}

		return validators;
	}

	private getRound(height?: number): Contracts.Shared.RoundInfo {
		if (!height) {
			height = this.stateStore.getLastBlock().data.height;
		}

		return AppUtils.roundCalculator.calculateRound(height, this.configuration);
	}

	private async setForgingValidatorsOfRound(
		roundInfo: Contracts.Shared.RoundInfo,
		validators?: Contracts.State.Wallet[],
	): Promise<void> {
		// ! it's this.getActiveValidators(roundInfo, validators);
		// ! only last part of that function which reshuffles validators is used
		const result = await this.triggers.call("getActiveValidators", { roundInfo, validators });
		this.forgingValidators = (result as Contracts.State.Wallet[]) || [];
	}

	private async calcPreviousActiveValidators(
		roundInfo: Contracts.Shared.RoundInfo,
		blocks: Contracts.Crypto.IBlock[],
	): Promise<Contracts.State.Wallet[]> {
		const previousRoundState = await this.getDposPreviousRoundState(blocks, roundInfo);

		// TODO: Move to Dpos
		for (const previousRoundValidatorWallet of previousRoundState.getActiveValidators()) {
			// ! name suggest that this is pure function
			// ! when in fact it is manipulating current wallet repository setting validator ranks
			const username = previousRoundValidatorWallet.getAttribute("validator.username");
			const validatorWallet = this.walletRepository.findByUsername(username);
			validatorWallet.setAttribute("validator.rank", previousRoundValidatorWallet.getAttribute("validator.rank"));
		}

		// ! return readonly array instead of taking slice
		return [...previousRoundState.getRoundValidators()];
	}
}
