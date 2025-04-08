import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ConsensusAbi } from "@mainsail/evm-contracts";
import { BigNumber } from "@mainsail/utils";
import { ethers } from "ethers";

import { Identifiers as EvmConsensusIdentifiers } from "../identifiers.js";
import { AsyncValidatorRoundsIterator } from "./rounds-iterator.js";
import { AsyncVotesIterator } from "./votes-iterator.js";

@injectable()
export class ConsensusContractService implements Contracts.Evm.ConsensusContractService {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	async getActiveValidators(): Promise<Contracts.State.ValidatorWallet[]> {
		const consensusContractAddress = this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
		const deployerAddress = this.app.get<string>(EvmConsensusIdentifiers.Internal.Addresses.Deployer);
		const { evmSpec } = this.configuration.getMilestone();

		const iface = new ethers.Interface(ConsensusAbi.abi);
		const data = iface.encodeFunctionData("getActiveValidators").slice(2);

		const result = await this.evm.view({
			data: Buffer.from(data, "hex"),
			from: deployerAddress,
			specId: evmSpec,
			to: consensusContractAddress,
		});

		if (!result.success) {
			await this.app.terminate("getActiveValidators failed");
		}

		const [validators] = iface.decodeFunctionResult("getActiveValidators", result.output!);

		const validatorWallets: Contracts.State.ValidatorWallet[] = [];
		for (const [, validator] of validators.entries()) {
			const [address, [votersCount, voteBalance, isResigned, blsPublicKey]] = validator;

			const validatorWallet: Contracts.State.ValidatorWallet = {
				address,
				blsPublicKey: blsPublicKey.slice(2),
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

		const iface = new ethers.Interface(ConsensusAbi.abi);
		const data = iface.encodeFunctionData("getAllValidators").slice(2);

		const result = await this.evm.view({
			data: Buffer.from(data, "hex"),
			from: deployerAddress,
			specId: evmSpec,
			to: consensusContractAddress,
		});

		if (!result.success) {
			await this.app.terminate("getAllValidators failed");
		}

		const [validators] = iface.decodeFunctionResult("getAllValidators", result.output!);

		const validatorWallets: Contracts.State.ValidatorWallet[] = [];
		for (const [, validator] of validators.entries()) {
			const [address, [votersCount, voteBalance, isResigned, blsPublicKey]] = validator;

			const validatorWallet: Contracts.State.ValidatorWallet = {
				address,
				blsPublicKey: blsPublicKey.slice(2),
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

		const iface = new ethers.Interface(ConsensusAbi.abi);
		const data = iface.encodeFunctionData("getVotesCount").slice(2);

		const result = await this.evm.view({
			data: Buffer.from(data, "hex"),
			from: deployerAddress,
			specId: evmSpec,
			to: consensusContractAddress,
		});

		if (!result.success) {
			await this.app.terminate("getVotesCount failed");
		}

		const [voters] = iface.decodeFunctionResult("getVotesCount", result.output!);

		return Number(voters);
	}

	getVotes(): AsyncIterable<Contracts.Evm.Vote> {
		return this.app.resolve(AsyncVotesIterator);
	}
}
