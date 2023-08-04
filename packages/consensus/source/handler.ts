import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { CommittedBlockState } from "./committed-block-state";

@injectable()
export class Handler implements Contracts.Consensus.IHandler {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockProcessor)
	private readonly processor!: Contracts.BlockProcessor.Processor;

	// public async onProposal(proposal: Contracts.Crypto.IProposal): Promise<void> {
	// 	if (!this.#isValidHeightAndRound(proposal)) {
	// 		return;
	// 	}

	// 	const { errors } = await this.verifier.verifyProposal(proposal);
	// 	if (errors.length > 0) {
	// 		this.logger.warning(`received invalid proposal: ${proposal.toString()} errors: ${JSON.stringify(errors)}`);
	// 		return;
	// 	}

	// 	const roundState = this.roundStateRepo.getRoundState(proposal.height, proposal.round);

	// 	if (await roundState.addProposal(proposal)) {
	// 		await this.storage.saveProposal(proposal);

	// 		await this.#getConsensus().handle(roundState);
	// 	}
	// }

	// public async onPrevote(prevote: Contracts.Crypto.IPrevote): Promise<void> {
	// 	if (!this.#isValidHeightAndRound(prevote)) {
	// 		return;
	// 	}

	// 	const { errors } = await this.verifier.verifyPrevote(prevote);
	// 	if (errors.length > 0) {
	// 		this.logger.warning(`received invalid prevote: ${prevote.toString()} errors: ${JSON.stringify(errors)}`);
	// 		return;
	// 	}

	// 	const roundState = this.roundStateRepo.getRoundState(prevote.height, prevote.round);

	// 	if (await roundState.addPrevote(prevote)) {
	// 		await this.storage.savePrevote(prevote);

	// 		await this.#getConsensus().handle(roundState);
	// 	}
	// }

	// public async onPrecommit(precommit: Contracts.Crypto.IPrecommit): Promise<void> {
	// 	if (!this.#isValidHeightAndRound(precommit)) {
	// 		return;
	// 	}

	// 	const { errors } = await this.verifier.verifyPrecommit(precommit);
	// 	if (errors.length > 0) {
	// 		this.logger.warning(
	// 			`received invalid precommit: ${precommit.toString()} errors: ${JSON.stringify(errors)}`,
	// 		);
	// 		return;
	// 	}

	// 	const roundState = this.roundStateRepo.getRoundState(precommit.height, precommit.round);

	// 	if (await roundState.addPrecommit(precommit)) {
	// 		await this.storage.savePrecommit(precommit);

	// 		await this.#getConsensus().handle(roundState);
	// 	}
	// }

	async onCommittedBlock(committedBlock: Contracts.Crypto.ICommittedBlock): Promise<void> {
		// TODO: Check precommits
		const committedBlockState = this.app.resolve(CommittedBlockState).configure(committedBlock);

		committedBlockState.setProcessorResult(await this.processor.process(committedBlockState));

		await this.#getConsensus().handleCommittedBlockState(committedBlockState);
	}

	#getConsensus(): Contracts.Consensus.IConsensusService {
		return this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
	}
}
