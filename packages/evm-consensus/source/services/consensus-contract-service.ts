import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { zeroAddress } from "viem";

import { ConsensusContractCaller } from "./consensus-contract-caller.js";
import { AsyncValidatorRoundsIterator } from "./rounds-iterator.js";
import { ConsensusContractValidator, toValidatorWallet } from "./validator-wallet.js";
import { AsyncValidatorsIterator } from "./validators-iterator.js";
import { AsyncVotesIterator } from "./votes-iterator.js";

const ACCOUNTS_PER_REQUEST = 1000;

@injectable()
export class ConsensusContractService implements Contracts.Evm.ConsensusContractService {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.EvmConsensus.ConsensusContractCaller)
	private readonly contractCaller!: ConsensusContractCaller;

	async getRoundValidators(): Promise<Contracts.State.ValidatorWallet[]> {
		const validators = await this.contractCaller.view<ConsensusContractValidator[]>("getRoundValidators");

		return validators.map((validator) => toValidatorWallet(validator));
	}

	async getAllValidators(): Promise<Contracts.State.ValidatorWallet[]> {
		const validators = await this.contractCaller.view<ConsensusContractValidator[]>("getAllValidators");

		return validators.map((validator) => toValidatorWallet(validator));
	}

	getValidators(): AsyncIterable<Contracts.State.ValidatorWallet> {
		return this.app.resolve(AsyncValidatorsIterator);
	}

	async getValidatorsOf(addresses: string[]): Promise<Contracts.State.ValidatorWallet[]> {
		const validators = new Map<string, Contracts.State.ValidatorWallet>();

		for (let index = 0; index < addresses.length; index += ACCOUNTS_PER_REQUEST) {
			const chunk = await this.contractCaller.view<ConsensusContractValidator[]>("getValidatorsOf", [
				addresses.slice(index, index + ACCOUNTS_PER_REQUEST),
			]);

			for (const validator of chunk) {
				validators.set(validator.addr, toValidatorWallet(validator));
			}
		}

		return [...validators.values()];
	}

	async getValidatorsByBlsPublicKeys(
		blsPublicKeys: string[],
	): Promise<(Contracts.State.ValidatorWallet | undefined)[]> {
		const validators = await this.contractCaller.view<ConsensusContractValidator[]>(
			"getValidatorsByBlsPublicKeys",
			[blsPublicKeys.map((blsPublicKey) => `0x${blsPublicKey}`)],
		);

		return validators.map((validator) =>
			validator.addr === zeroAddress ? undefined : toValidatorWallet(validator),
		);
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
