import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { ConsensusContractCaller } from "./consensus-contract-caller.js";
import { AsyncValidatorRoundsIterator } from "./rounds-iterator.js";
import { AsyncVotesIterator } from "./votes-iterator.js";

interface ConsensusContractValidator {
	readonly addr: string;
	readonly data: {
		readonly voteBalance: bigint;
		readonly fee: bigint;
		readonly votersCount: bigint;
		readonly isResigned: boolean;
		readonly blsPublicKey: string;
	};
}

@injectable()
export class ConsensusContractService implements Contracts.Evm.ConsensusContractService {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.EvmConsensus.ConsensusContractCaller)
	private readonly contractCaller!: ConsensusContractCaller;

	async getRoundValidators(): Promise<Contracts.State.ValidatorWallet[]> {
		const validators = await this.contractCaller.view<ConsensusContractValidator[]>("getRoundValidators");

		const validatorWallets: Contracts.State.ValidatorWallet[] = [];
		for (const validator of validators) {
			const {
				addr: address,
				data: { blsPublicKey, fee, isResigned, voteBalance, votersCount },
			} = validator;

			const validatorWallet: Contracts.State.ValidatorWallet = {
				address,
				blsPublicKey: blsPublicKey.slice(2),
				fee: fee,
				isResigned,
				voteBalance: voteBalance,
				votersCount: Number(votersCount),
			};

			validatorWallets.push(validatorWallet);
		}

		return validatorWallets;
	}

	async getAllValidators(): Promise<Contracts.State.ValidatorWallet[]> {
		const validators = await this.contractCaller.view<ConsensusContractValidator[]>("getAllValidators");

		const validatorWallets: Contracts.State.ValidatorWallet[] = [];
		for (const validator of validators) {
			const {
				addr: address,
				data: { blsPublicKey, fee, isResigned, voteBalance, votersCount },
			} = validator;

			const validatorWallet: Contracts.State.ValidatorWallet = {
				address: address,
				blsPublicKey: blsPublicKey.slice(2),
				fee: fee,
				isResigned,
				voteBalance: voteBalance,
				votersCount: Number(votersCount),
			};

			validatorWallets.push(validatorWallet);
		}

		return validatorWallets;
	}

	getValidatorRounds(): AsyncIterable<Contracts.Evm.ValidatorRound> {
		return this.app.resolve(AsyncValidatorRoundsIterator);
	}

	async getVotesCount(): Promise<number> {
		const voters = await this.contractCaller.view<bigint>("getVotesCount");

		return Number(voters);
	}

	getVotes(): AsyncIterable<Contracts.Evm.Vote> {
		return this.app.resolve(AsyncVotesIterator);
	}
}
