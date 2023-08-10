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
		const nameLookup = new Map<string, string>();

		for (const validator of validators) {
			nameLookup.set(validator.getPublicKey()!, validator.getAttribute<string>("validator.username"));
		}

		const collectMessages = (messages: ReadonlyArray<Contracts.Crypto.IPrevote | Contracts.Crypto.IPrecommit>) => {
			const collected = {
				absent: validators.map((v) => nameLookup.get(v.getPublicKey()!) ?? v.getPublicKey()),
			};

			for (const message of messages) {
				const validator = validators[message.validatorIndex];
				if (message.blockId) {
					const key = `b/${message.height}/${message.round}/${message.blockId}`;
					if (!collected[key]) {
						collected[key] = {};
					}

					const name = nameLookup.get(validator.getPublicKey()!) ?? validator.getPublicKey();
					collected[key][name] = message.signature;
					collected.absent.splice(collected.absent.indexOf(name), 1);
				}
			}

			return collected;
		};

		return {
			data: {
				height: state.height,
				lockedRound: state.lockedRound,
				lockedValue: state.lockedValue ? state.lockedValue.getProposal()?.block.block.header.id : null,
				proposals: proposals.map((p) => ({
					name: nameLookup.get(validators[p.validatorIndex].getPublicKey()!) ?? validators[p.validatorIndex].getPublicKey(),
					data: p.toData(),
					lockProof: p.block.lockProof,
				})),
				precommits: collectMessages(precommits),
				prevotes: collectMessages(prevotes),
				round: state.round,
				step: state.step,
				validRound: state.validRound,
				validValue: state.validValue ? state.validValue.getProposal()?.block.block.header.id : null,
				validators: validators.map((v) => ({
					name: v.getAttribute<string>("validator.username"),
					index: this.validatorSet.getValidatorIndexByPublicKey(v.getPublicKey()!),
					walletPublicKey: v.getPublicKey(),
					consensusPublicKey: v.getAttribute<string>("validator.consensusPublicKey"),
				})),
			},
		};
	}
}
