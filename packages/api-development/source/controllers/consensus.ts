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

		const validators = this.validatorSet.getActiveValidators(state.height);
		const nameLookup = new Map<string, string>();

		for (const validator of validators) {
			nameLookup.set(validator.getWalletPublicKey(), validator.getUsername());
		}

		const collectMessages = (messages: ReadonlyArray<Contracts.Crypto.IPrevote | Contracts.Crypto.IPrecommit>) => {
			const collected = {
				absent: validators.map((v) => nameLookup.get(v.getWalletPublicKey()!) ?? v.getWalletPublicKey()),
			};

			for (const message of messages) {
				const validator = validators[message.validatorIndex];
				const key = `b/${message.height}/${message.round}/${message.blockId}`;
				if (!collected[key]) {
					collected[key] = {};
				}

				const name = nameLookup.get(validator.getWalletPublicKey()!) ?? validator.getWalletPublicKey();
				collected[key][name] = message.signature;
				collected.absent.splice(collected.absent.indexOf(name), 1);
			}

			return collected;
		};

		return {
			data: {
				height: state.height,
				lockedRound: state.lockedRound,
				lockedValue: state.lockedValue ? state.lockedValue.getProposal()?.block.block.header.id : null,
				precommits: collectMessages(precommits.sort((a, b) => b.round - a.round)),
				prevotes: collectMessages(prevotes.sort((a, b) => b.round - a.round)),
				proposals: proposals
					.sort((a, b) => b.round - a.round)
					.map((p) => ({
						data: p.toData(),
						lockProof: p.block.lockProof,
						name:
							nameLookup.get(validators[p.validatorIndex].getWalletPublicKey()!) ??
							validators[p.validatorIndex].getWalletPublicKey(),
					})),
				round: state.round,
				step: state.step,
				validRound: state.validRound,
				validValue: state.validValue ? state.validValue.getProposal()?.block.block.header.id : null,
				validators: validators.map((v) => ({
					consensusPublicKey: v.getConsensusPublicKey(),
					index: this.validatorSet.getValidatorIndexByWalletPublicKey(v.getWalletPublicKey()),
					name: v.getUsername(),
					walletPublicKey: v.getWalletPublicKey(),
				})),
			},
		};
	}
}
