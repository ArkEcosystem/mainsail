import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Container, Services } from "@arkecosystem/core-kernel";

@Container.injectable()
export class DposPreviousRoundState implements Contracts.State.DposPreviousRoundState {
	@Container.inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@Container.inject(Identifiers.BlockState)
	@Container.tagged("state", "clone")
	private readonly blockState!: Contracts.State.BlockState;

	@Container.inject(Identifiers.DposState)
	@Container.tagged("state", "clone")
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
			.call("buildDelegateRanking", { dposState: this.dposState });

		this.dposState.setDelegatesRound(roundInfo);
	}

	public getAllDelegates(): readonly Contracts.State.Wallet[] {
		return this.dposState.getAllDelegates();
	}

	public getActiveDelegates(): readonly Contracts.State.Wallet[] {
		return this.dposState.getActiveDelegates();
	}

	public getRoundDelegates(): readonly Contracts.State.Wallet[] {
		return this.dposState.getRoundDelegates();
	}
}
