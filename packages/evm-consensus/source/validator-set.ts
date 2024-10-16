import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { ConsensusAbi } from "@mainsail/evm-contracts";
import { Utils } from "@mainsail/kernel";
import { ethers } from "ethers";

import { Identifiers as EvmConsensusIdentifiers } from "./identifiers.js";

@injectable()
export class ValidatorSet implements Contracts.ValidatorSet.Service {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	#topValidators: Contracts.State.ValidatorWallet[] = [];
	#indexByAddress: Map<string, number> = new Map();

	#allValidators: Map<string, Contracts.State.ValidatorWallet> = new Map();
	#dirtyValidators: Contracts.State.ValidatorWallet[] = [];

	public async restore(): Promise<void> {
		await this.#buildActiveValidators();

		const validators = await this.#getAllValidators();
		this.#allValidators = new Map(validators.map((validator) => [validator.address, validator]));
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (Utils.roundCalculator.isNewRound(unit.height + 1, this.configuration)) {
			await this.#buildActiveValidators();
		}

		await this.#calculateChangedValidators();
	}

	public getAllValidators(): Contracts.State.ValidatorWallet[] {
		return [...this.#allValidators.values()];
	}

	public getDirtyValidators(): Contracts.State.ValidatorWallet[] {
		return this.#dirtyValidators;
	}

	public getActiveValidators(): Contracts.State.ValidatorWallet[] {
		const { activeValidators } = this.configuration.getMilestone();

		if (this.#topValidators.length !== activeValidators) {
			throw new Exceptions.NotEnoughActiveValidatorsError(this.#topValidators.length, activeValidators);
		}

		return this.#topValidators.slice(0, activeValidators);
	}

	public getValidator(index: number): Contracts.State.ValidatorWallet {
		return this.#topValidators[index];
	}

	public getValidatorIndexByWalletAddress(walletAddress: string): number {
		const result = this.#indexByAddress.get(walletAddress);

		if (result === undefined) {
			throw new Error(`Validator ${walletAddress} not found.`);
		}

		return result;
	}

	async #buildActiveValidators(): Promise<void> {
		const { activeValidators } = this.configuration.getMilestone();
		const validators = await this.#getActiveValidators();
		if (validators.length < activeValidators) {
			throw new Exceptions.NotEnoughActiveValidatorsError(this.#topValidators.length, activeValidators);
		}

		this.#topValidators = validators.slice(0, activeValidators);
		this.#indexByAddress = new Map(this.#topValidators.map((validator, index) => [validator.address, index]));
	}

	async #calculateChangedValidators(): Promise<void> {
		this.#dirtyValidators = [];

		const validators = await this.#getAllValidators();
		for (const validator of validators) {
			const currentValidator = this.#allValidators.get(validator.address);
			if (
				!currentValidator ||
				!currentValidator.voteBalance.isEqualTo(validator.voteBalance) ||
				currentValidator.isResigned !== validator.isResigned ||
				currentValidator.votersCount !== validator.votersCount ||
				currentValidator.blsPublicKey !== validator.blsPublicKey
			) {
				this.#dirtyValidators.push(validator);
			}
		}

		this.#allValidators = new Map(validators.map((validator) => [validator.address, validator]));
	}

	async #getActiveValidators(): Promise<Contracts.State.ValidatorWallet[]> {
		const consensusContractAddress = this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
		const deployerAddress = this.app.get<string>(EvmConsensusIdentifiers.Internal.Addresses.Deployer);
		const { evmSpec } = this.configuration.getMilestone();

		const iface = new ethers.Interface(ConsensusAbi.abi);
		const data = iface.encodeFunctionData("getTopValidators").slice(2);

		const result = await this.evm.view({
			caller: deployerAddress,
			data: Buffer.from(data, "hex"),
			recipient: consensusContractAddress,
			specId: evmSpec,
		});

		if (!result.success) {
			this.app.terminate("getTopValidators failed");
		}

		const [validators] = iface.decodeFunctionResult("getTopValidators", result.output!);

		const validatorWallets: Contracts.State.ValidatorWallet[] = [];
		for (const [, validator] of validators.entries()) {
			const [address, [votersCount, voteBalance, isResigned, blsPublicKey]] = validator;

			const validatorWallet: Contracts.State.ValidatorWallet = {
				address,
				blsPublicKey: blsPublicKey.slice(2),
				isResigned,
				voteBalance: Utils.BigNumber.make(voteBalance),
				votersCount: Number(votersCount),
			};

			validatorWallets.push(validatorWallet);
		}

		return validatorWallets;
	}

	async #getAllValidators(): Promise<Contracts.State.ValidatorWallet[]> {
		const consensusContractAddress = this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
		const deployerAddress = this.app.get<string>(EvmConsensusIdentifiers.Internal.Addresses.Deployer);
		const { evmSpec } = this.configuration.getMilestone();

		const iface = new ethers.Interface(ConsensusAbi.abi);
		const data = iface.encodeFunctionData("getAllValidators").slice(2);

		const result = await this.evm.view({
			caller: deployerAddress,
			data: Buffer.from(data, "hex"),
			recipient: consensusContractAddress,
			specId: evmSpec,
		});

		if (!result.success) {
			this.app.terminate("getAllValidators failed");
		}

		const [validators] = iface.decodeFunctionResult("getAllValidators", result.output!);

		const validatorWallets: Contracts.State.ValidatorWallet[] = [];
		for (const [, validator] of validators.entries()) {
			const [address, [votersCount, voteBalance, isResigned, blsPublicKey]] = validator;

			const validatorWallet: Contracts.State.ValidatorWallet = {
				address,
				blsPublicKey: blsPublicKey.slice(2),
				isResigned,
				voteBalance: Utils.BigNumber.make(voteBalance),
				votersCount: Number(votersCount),
			};

			validatorWallets.push(validatorWallet);
		}

		return validatorWallets;
	}
}
