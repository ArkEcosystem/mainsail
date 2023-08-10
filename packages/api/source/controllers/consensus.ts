import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { Controller } from "./controller";

@injectable()
export class ConsensusController extends Controller {
	@inject(Identifiers.Consensus.Storage)
	private readonly storage!: Contracts.Consensus.IConsensusStorage;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	public async state(request: Hapi.Request) {
		const state = await this.storage.getState();
		if (!state) {
			return {};
		}

		Utils.assert.defined<Contracts.Consensus.IConsensusState>(state);

		const proposals = await this.storage.getProposals();
		const precommits = await this.storage.getPrecommits();
		const prevotes = await this.storage.getPrevotes();

		const validators = this.validatorSet.getActiveValidators();

		const collectMessages = (messages: ReadonlyArray<Contracts.Crypto.IPrevote | Contracts.Crypto.IPrecommit>) => {
			const collected = {
				// public keys
				absent: [] as string[],
			};

			for (const message of messages) {
				const validatorKey = this.validatorSet.getValidatorPublicKeyByIndex(message.validatorIndex);
				if (message.blockId) {
					const key = `b/${message.height}/${message.round}/${message.blockId}`;
					if (!collected[key]) {
						collected[key] = {};
					}

					collected[key][`v-${validatorKey}`] = message.signature;
				} else {
					collected.absent.push(validatorKey);
				}
			}

			return collected;
		}

		return {
			data: {
				height: state.height,
				lockedRound: state.lockedRound,
				lockedValue: state.lockedValue ? state.lockedValue.getProposal()?.block.block.header.id : null,
				round: state.round,
				step: state.step,
				validRound: state.validRound,
				validValue: state.validValue ? state.validValue.getProposal()?.block.block.header.id : null,
				proposals: proposals.map(p => ({
					lockProof: p.block.lockProof,
					data: p.toData(),
				})),
				prevotes: collectMessages(prevotes),
				precommits: collectMessages(precommits),
				validators: validators.map(v => ({
					index: this.validatorSet.getValidatorIndexByPublicKey(v.getPublicKey()!),
					publicKey: v.getPublicKey(),
					consensusPublicKey: v.getAttribute<string>("validator.consensusPublicKey")
				})),
			},
		};
	}
}
