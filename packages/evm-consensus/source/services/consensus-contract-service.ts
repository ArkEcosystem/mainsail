import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { ConsensusAbi } from "@mainsail/evm-contracts";
import { BigNumber } from "@mainsail/utils";
import { decodeFunctionResult, encodeFunctionData, toHex } from "viem";

import { Identifiers as EvmConsensusIdentifiers } from "../identifiers.js";
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

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	async getRoundValidators(): Promise<Contracts.State.ValidatorWallet[]> {
		const consensusContractAddress = this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
		const deployerAddress = this.app.get<string>(EvmConsensusIdentifiers.Internal.Addresses.Deployer);
		const { evmSpec } = this.configuration.getMilestone();

		const data = encodeFunctionData({
			abi: ConsensusAbi.abi,
			args: undefined,
			functionName: "getRoundValidators",
		}).slice(2);

		const result = await this.evm.view({
			data: Buffer.from(data, "hex"),
			from: deployerAddress,
			specId: evmSpec,
			to: consensusContractAddress,
		});

		if (!result.success) {
			await this.app.terminate("getRoundValidators failed");
		}

		const validators = decodeFunctionResult({
			abi: ConsensusAbi.abi,
			data: toHex(result.output!),
			functionName: "getRoundValidators",
		}) as ConsensusContractValidator[];

		const validatorWallets: Contracts.State.ValidatorWallet[] = [];
		for (const validator of validators) {
			const {
				addr: address,
				data: { voteBalance, fee, votersCount, isResigned, blsPublicKey },
			} = validator;

			const validatorWallet: Contracts.State.ValidatorWallet = {
				address,
				blsPublicKey: blsPublicKey.slice(2),
				fee: BigNumber.make(fee),
				isResigned,
				voteBalance: BigNumber.make(voteBalance),
				votersCount: Number(votersCount),
			};

			validatorWallets.push(validatorWallet);
		}

		return validatorWallets;
	}

	async getAllValidators(): Promise<Contracts.State.ValidatorWallet[]> {
		const consensusContractAddress = this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
		const deployerAddress = this.app.get<string>(EvmConsensusIdentifiers.Internal.Addresses.Deployer);
		const { evmSpec } = this.configuration.getMilestone();

		const data = encodeFunctionData({
			abi: ConsensusAbi.abi,
			args: undefined,
			functionName: "getAllValidators",
		}).slice(2);

		const result = await this.evm.view({
			data: Buffer.from(data, "hex"),
			from: deployerAddress,
			specId: evmSpec,
			to: consensusContractAddress,
		});

		if (!result.success) {
			await this.app.terminate("getAllValidators failed");
		}

		const validators = decodeFunctionResult({
			abi: ConsensusAbi.abi,
			data: toHex(result.output!),
			functionName: "getAllValidators",
		}) as ConsensusContractValidator[];

		const validatorWallets: Contracts.State.ValidatorWallet[] = [];
		for (const validator of validators) {
			const {
				addr: address,
				data: { voteBalance, fee, votersCount, isResigned, blsPublicKey },
			} = validator;

			const validatorWallet: Contracts.State.ValidatorWallet = {
				address: address,
				blsPublicKey: blsPublicKey.slice(2),
				fee: BigNumber.make(fee),
				isResigned,
				voteBalance: BigNumber.make(voteBalance),
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
		const consensusContractAddress = this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
		const deployerAddress = this.app.get<string>(EvmConsensusIdentifiers.Internal.Addresses.Deployer);
		const { evmSpec } = this.configuration.getMilestone();

		const data = encodeFunctionData({
			abi: ConsensusAbi.abi,
			args: undefined,
			functionName: "getVotesCount",
		}).slice(2);

		const result = await this.evm.view({
			data: Buffer.from(data, "hex"),
			from: deployerAddress,
			specId: evmSpec,
			to: consensusContractAddress,
		});

		if (!result.success) {
			await this.app.terminate("getVotesCount failed");
		}

		const voters = decodeFunctionResult({
			abi: ConsensusAbi.abi,
			data: toHex(result.output!),
			functionName: "getVotesCount",
		}) as bigint;

		return Number(voters);
	}

	getVotes(): AsyncIterable<Contracts.Evm.Vote> {
		return this.app.resolve(AsyncVotesIterator);
	}
}
