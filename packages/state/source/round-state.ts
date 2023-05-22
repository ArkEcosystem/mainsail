import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Services, Utils as AppUtils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";
import assert from "assert";

@injectable()
export class RoundState {
	@inject(Identifiers.Database.Service)
	private readonly databaseService: Contracts.Database.IDatabaseService;

	@inject(Identifiers.DposState)
	@tagged("state", "blockchain")
	private readonly dposState!: Contracts.State.DposState;

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
	@tagged("type", "wallet")
	private readonly addressFactory: Contracts.Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.HashFactory)
	private readonly hashFactory: Contracts.Crypto.IHashFactory;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: Contracts.Crypto.Slots;

	#blocksInCurrentRound: Contracts.Crypto.IBlock[] = [];
	#forgingValidators: Contracts.State.Wallet[] = [];

	public async applyBlock(block: Contracts.Crypto.IBlock): Promise<void> {
		this.#blocksInCurrentRound.push(block);

		await this.#applyRound(block.data.height);
	}

	// TODO: Check if can restore from state
	public async restore(): Promise<void> {
		const block = this.stateStore.getLastBlock();
		const roundInfo = this.#getRound(block.data.height);

		this.#blocksInCurrentRound = await this.#getBlocksForRound();

		await this.#setForgingValidatorsOfRound(roundInfo);

		await this.databaseService.deleteRound(roundInfo.round + 1);

		await this.#applyRound(block.data.height);
	}

	public async getActiveValidators(
		roundInfo?: Contracts.Shared.RoundInfo,
		validators?: Contracts.State.Wallet[],
	): Promise<Contracts.State.Wallet[]> {
		if (!roundInfo) {
			roundInfo = this.#getRound();
		}

		if (
			this.#forgingValidators.length > 0 &&
			this.#forgingValidators[0].getAttribute<number>("validator.round") === roundInfo.round
		) {
			return this.#forgingValidators;
		}

		// When called during #applyRound we already know the validators, so we don't have to query the database.
		if (!validators) {
			validators = [];
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
		return this.#shuffleValidators(roundInfo, validators ?? []);
	}

	public async detectMissedBlocks(block: Contracts.Crypto.IBlock): Promise<void> {
		const lastBlock: Contracts.Crypto.IBlock = this.stateStore.getLastBlock();

		if (lastBlock.data.height === 1) {
			return;
		}

		const lastSlot: number = await this.slots.getSlotNumber(lastBlock.data.timestamp);
		const currentSlot: number = await this.slots.getSlotNumber(block.data.timestamp);

		const missedSlots: number = Math.min(currentSlot - lastSlot - 1, this.#forgingValidators.length);
		for (let index = 0; index < missedSlots; index++) {
			const missedSlot: number = lastSlot + index + 1;
			const validator: Contracts.State.Wallet =
				this.#forgingValidators[missedSlot % this.#forgingValidators.length];

			this.logger.debug(
				`Validator ${validator.getAttribute(
					"validator.username",
				)} (${validator.getPublicKey()}) just missed a block.`,
			);

			await this.events.dispatch(Enums.ForgerEvent.Missing, {
				validator,
			});
		}
	}

	async #applyRound(height: number): Promise<void> {
		if (height === 1 || AppUtils.roundCalculator.isNewRound(height + 1, this.configuration)) {
			const roundInfo = this.#getRound(height + 1);

			this.logger.info(`Starting Round ${roundInfo.round.toLocaleString()}`);

			await this.#detectMissedRound();

			this.dposState.buildValidatorRanking();
			this.dposState.setValidatorsRound(roundInfo);

			await this.#setForgingValidatorsOfRound(roundInfo, [...this.dposState.getRoundValidators()]);

			await this.databaseService.saveRound(this.dposState.getRoundValidators());

			this.#blocksInCurrentRound = [];

			await this.events.dispatch(Enums.RoundEvent.Applied);
		}
	}

	async #detectMissedRound(): Promise<void> {
		for (const validator of this.#forgingValidators) {
			const isBlockProduced = this.#blocksInCurrentRound.some(
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

				await this.events.dispatch(Enums.RoundEvent.Missed, {
					validator: wallet,
				});
			}
		}
	}

	async #getBlocksForRound(): Promise<Contracts.Crypto.IBlock[]> {
		const lastBlock = this.stateStore.getLastBlock();
		const roundInfo = this.#getRound(lastBlock.data.height);

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
			blocks[index] = await this.blockFactory.fromData(blocks[index]);
		}

		// @ts-ignore
		return blocks;
	}

	async #shuffleValidators(
		roundInfo: Contracts.Shared.RoundInfo,
		validators: Contracts.State.Wallet[],
	): Promise<Contracts.State.Wallet[]> {
		const seedSource: string = roundInfo.round.toString();
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

	#getRound(height?: number): Contracts.Shared.RoundInfo {
		if (!height) {
			height = this.stateStore.getLastBlock().data.height;
		}

		return AppUtils.roundCalculator.calculateRound(height, this.configuration);
	}

	async #setForgingValidatorsOfRound(
		roundInfo: Contracts.Shared.RoundInfo,
		validators?: Contracts.State.Wallet[],
	): Promise<void> {
		// ! it's this.getActiveValidators(roundInfo, validators);
		// ! only last part of that function which reshuffles validators is used
		const result = await this.triggers.call("getActiveValidators", { roundInfo, validators });
		this.#forgingValidators = (result as Contracts.State.Wallet[]) || [];
	}
}
