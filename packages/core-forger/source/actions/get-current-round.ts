import { Contracts } from "@arkecosystem/core-contracts";
import { Services, Utils } from "@arkecosystem/core-kernel";
import { DatabaseInteraction } from "@arkecosystem/core-state";

@injectable()
export class GetCurrentRoundAction extends Services.Triggers.Action {
	@inject(Identifiers.Application)
	private readonly app: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.DatabaseInteraction)
	private readonly databaseInteraction: DatabaseInteraction;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: Contracts.Crypto.Slots;

	public async execute(): Promise<Contracts.P2P.CurrentRound> {
		const lastBlock = this.blockchain.getLastBlock();

		const height = lastBlock.data.height + 1;
		const roundInfo = Utils.roundCalculator.calculateRound(height, this.configuration);

		const reward = this.configuration.getMilestone(height).reward;
		const validators: Contracts.P2P.ValidatorWallet[] = (
			await this.databaseInteraction.getActiveValidators(roundInfo)
		).map((wallet) => ({
			...wallet.getData(),
			validator: wallet.getAttribute("validator"),
		}));

		const timestamp = this.slots.getTime();
		const forgingInfo = await Utils.forgingInfoCalculator.calculateForgingInfo(timestamp, height, this.app);

		return {
			canForge: forgingInfo.canForge,
			current: roundInfo.round,
			currentForger: validators[forgingInfo.currentForger],
			lastBlock: lastBlock.data,
			nextForger: validators[forgingInfo.nextForger],
			reward,
			timestamp: forgingInfo.blockTimestamp,
			validators,
		};
	}
}
