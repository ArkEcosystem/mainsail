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

	@inject(Identifiers.State.ValidatorWallet.Factory)
	private readonly validatorWalletFactory!: Contracts.State.ValidatorWalletFactory;

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

		this.#indexByAddress = new Map();
		for (const [index, validator] of this.#validators.entries()) {
			const address = validator.getWallet().getAddress();
			this.#indexByAddress.set(address, index);
		}

		store.setAttribute("activeValidators", this.#validators.map((v) => v.getWallet().getAddress()).join(","));
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

		const totalSupply = Utils.supplyCalculator.calculateSupply(store.getLastHeight(), this.configuration);
		const [validators] = iface.decodeFunctionResult("getTopValidators", result.output!);

		const validatorWallets: Contracts.State.ValidatorWallet[] = [];
		for (const [index, validator] of validators.entries()) {
			const [addr, [voteBalance, , validatorPublicKey]] = validator;


			const wallet = store.walletRepository.findByAddress(addr);

			const validatorWallet = this.validatorWalletFactory(wallet);
			validatorWallet.getWallet().setAttribute("validatorVoteBalance", Utils.BigNumber.make(voteBalance));
			validatorWallet.getWallet().setAttribute("validatorPublicKey", validatorPublicKey.slice(2));

			validatorWallet.setRank(index + 1);
			validatorWallet.setApproval(
				Utils.validatorCalculator.calculateApproval(validatorWallet.getVoteBalance(), totalSupply),
			);

			store.walletRepository.setOnIndex(
				Contracts.State.WalletIndexes.Validators,
				validatorPublicKey.slice(2),
				validatorWallet.getWallet(),
			);

			validatorWallets.push(validatorWallet);
		}

		console.log("Getting active validators", validatorWallets);
		console.log(validatorWallets.map((v) => v.getWallet().getAddress()));

		return validatorWallets;
	}
}
