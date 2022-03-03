import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Services } from "@arkecosystem/core-kernel";
import { injectable, inject, tagged } from "@arkecosystem/core-container";

@injectable()
export class DposPreviousRoundState implements Contracts.State.DposPreviousRoundState {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockState)
	@tagged("state", "clone")
	private readonly blockState!: Contracts.State.BlockState;

	@inject(Identifiers.DposState)
	@tagged("state", "clone")
	private readonly dposState!: Contracts.State.DposState;

	public async revert(blocks: Crypto.IBlock[], roundInfo: Contracts.Shared.RoundInfo): Promise<void> {
		for (const block of [...blocks].reverse()) {
			if (block.data.height === 1) {
				break;
			}
			await this.blockState.revertBlock(block);
		}

		await this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.call("buildValidatorRanking", { dposState: this.dposState });

		this.dposState.setValidatorsRound(roundInfo);
	}

	public getAllValidators(): readonly Contracts.State.Wallet[] {
		return this.dposState.getAllValidators();
	}

	public getActiveValidators(): readonly Contracts.State.Wallet[] {
		return this.dposState.getActiveValidators();
	}

	public getRoundValidators(): readonly Contracts.State.Wallet[] {
		return this.dposState.getRoundValidators();
	}
}
