import type { Types } from "@mainsail/api-common";
import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { Controller } from "./controller.js";

@injectable()
export class ConsensusController extends Controller {
	@inject(Identifiers.Consensus.Service)
	private readonly consensus!: Contracts.Consensus.Service;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepository!: Contracts.Consensus.RoundStateRepository;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	public async state(request: Types.HapiRequest): Promise<object> {
		const state = this.consensus.getState();

		const roundStates = this.roundStateRepository.getRoundStates();

		const proposals = roundStates
			.map((roundState) => roundState.getProposal())
			.filter((proposal): proposal is Contracts.Crypto.Proposal => !!proposal);
		const prevotes = roundStates.flatMap((roundState) => roundState.getPrevotes());
		const precommits = roundStates.flatMap((roundState) => roundState.getPrecommits());

		const validators = this.validatorSet.getRoundValidators();

		const collectMessages = (messages: ReadonlyArray<Contracts.Crypto.Message>) => {
			const collected = {
				absent: validators,
			};

			for (const message of messages) {
				const validator = validators[message.validatorIndex];
				const key = `b/${message.blockNumber}/${message.round}/${message.blockHash}`;
				if (!collected[key]) {
					collected[key] = {};
				}

				const address = validator.address;
				collected[key][address] = message.signature;
				collected.absent.splice(
					collected.absent.findIndex((v) => v.address === address),
					1,
				);
			}

			return collected;
		};

		return {
			data: {
				blockNumber: state.blockNumber,
				lockedValue: state.lockedValue ? state.lockedValue.getProposal()?.blockHeader.hash : null,
				prevotes: collectMessages(prevotes.sort((a, b) => b.round - a.round)),
				// eslint-disable-next-line perfectionist/sort-objects
				lockedRound: state.lockedRound,
				proposals: proposals
					.sort((a, b) => b.round - a.round)
					.map((p) => ({
						data: p.toData(),
						lockProof: p.lockProof,
						name: validators[p.validatorIndex].toString(),
					})),
				round: state.round,
				step: state.step,
				// eslint-disable-next-line perfectionist/sort-objects
				precommits: collectMessages(precommits.sort((a, b) => b.round - a.round)),
				validRound: state.validRound,
				validValue: state.validValue ? state.validValue.getProposal()?.blockHeader.hash : null,

				// validators: validators.map((v) => ({
				// 	index: this.validatorSet.getValidatorIndexByWalletPublicKey(v.getWalletPublicKey()),
				// 	walletPublicKey: v.toString(),
				// })),
			},
		};
	}
}
