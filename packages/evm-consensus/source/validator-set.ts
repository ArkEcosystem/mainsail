import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { ethers } from "ethers";

import { CONSENSUS } from "./contracts.ts/index.js";
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

	#validators: Contracts.State.ValidatorWallet[] = [];
	#indexByAddress: Map<string, number> = new Map();

	public async restore(store: Contracts.State.Store): Promise<void> {
		await this.#buildActiveValidators(store);
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (Utils.roundCalculator.isNewRound(unit.height + 1, this.configuration)) {
			await this.#buildActiveValidators(unit.store);
		}
	}

	public getActiveValidators(): Contracts.State.ValidatorWallet[] {
		const { activeValidators } = this.configuration.getMilestone();

		if (this.#validators.length !== activeValidators) {
			throw new Exceptions.NotEnoughActiveValidatorsError(this.#validators.length, activeValidators);
		}

		return this.#validators.slice(0, activeValidators);
	}

	public getValidator(index: number): Contracts.State.ValidatorWallet {
		return this.#validators[index];
	}

	public getValidatorIndexByWalletAddress(walletAddress: string): number {
		const result = this.#indexByAddress.get(walletAddress);

		if (result === undefined) {
			throw new Error(`Validator ${walletAddress} not found.`);
		}

		return result;
	}

	async #buildActiveValidators(store: Contracts.State.Store): Promise<void> {
		const { activeValidators } = this.configuration.getMilestone();
		const validators = await this.#getActiveValidators(store);
		if (validators.length < activeValidators) {
			throw new Exceptions.NotEnoughActiveValidatorsError(this.#validators.length, activeValidators);
		}

		this.#validators = validators.slice(0, activeValidators);
		this.#indexByAddress = new Map(this.#validators.map((validator, index) => [validator.address, index]));
	}

	async #getActiveValidators(store: Contracts.State.Store): Promise<Contracts.State.ValidatorWallet[]> {
		const consensusContractAddress = this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
		const deployerAddress = this.app.get<string>(EvmConsensusIdentifiers.Internal.Addresses.Deployer);
		const { evmSpec } = this.configuration.getMilestone();

		const iface = new ethers.Interface(CONSENSUS.abi.abi);
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
		for (const [,validator] of validators.entries()) {
			const [address, [voteBalance,,blsPublicKey]] = validator;

			const validatorWallet: Contracts.State.ValidatorWallet = {
				address,
				blsPublicKey: blsPublicKey.slice(2),
				voteBalance,
			}

			validatorWallets.push(validatorWallet);
		}

		console.log("Getting active validators", validatorWallets);
		console.log(validatorWallets.map((v) => v));

		return validatorWallets;
	}
}
