import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { CONSENSUS } from "./contracts.ts/index.js";
import { Identifiers as EvmConsensusIdentifiers } from "./identifiers.js";

import { ethers } from "ethers";

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

	public restore(store: Contracts.State.Store): void {}

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

	public getValidatorIndexByWalletPublicKey(walletPublicKey: string): number {
		const result = this.#indexByAddress.get(walletPublicKey);

		if (result === undefined) {
			throw new Error(`Validator ${walletPublicKey} not found.`);
		}

		return result;
	}

	async #buildActiveValidators(store: Contracts.State.Store): Promise<void> {
		await this.#updateActiveValidators();

		const { activeValidators } = this.configuration.getMilestone();
		const validators = await this.#getActiveValidators(store);
		if (validators.length < activeValidators) {
			throw new Exceptions.NotEnoughActiveValidatorsError(this.#validators.length, activeValidators);
		}

		this.#validators = validators.slice(0, activeValidators);

		this.#indexByAddress = new Map();
		for (const [index, validator] of this.#validators.entries()) {
			const walletPublicKey = validator.getWalletPublicKey();
			Utils.assert.defined<string>(walletPublicKey);
			this.#indexByAddress.set(walletPublicKey, index);
		}

		store.setAttribute("activeValidators", this.#validators.map((v) => v.getWallet().getAddress()).join(","));
	}

	async #updateActiveValidators(): Promise<void> {
		const consensusContractAddress = this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
		const deployerAddress = this.app.get<string>(EvmConsensusIdentifiers.Internal.Addresses.Deployer);
		const { evmSpec } = this.configuration.getMilestone();

		const iface = new ethers.Interface(CONSENSUS.abi.abi);
		const data = iface.encodeFunctionData("updateActiveValidators").slice(2);

		const result = await this.evm.view({
			recipient: consensusContractAddress,
			caller: deployerAddress,
			specId: evmSpec,
			data: Buffer.from(data, "hex"),
		});

		if (!result.success) {
			console.log(result);
			this.app.terminate("updateActiveValidators failed");
		}
	}

	async #getActiveValidators(store: Contracts.State.Store): Promise<Contracts.State.ValidatorWallet[]> {
		const consensusContractAddress = this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
		const deployerAddress = this.app.get<string>(EvmConsensusIdentifiers.Internal.Addresses.Deployer);
		const { activeValidators, evmSpec } = this.configuration.getMilestone();

		const iface = new ethers.Interface(CONSENSUS.abi.abi);
		const data = iface.encodeFunctionData("getActiveValidators", [activeValidators]).slice(2);

		const result = await this.evm.view({
			recipient: consensusContractAddress,
			caller: deployerAddress,
			specId: evmSpec,
			data: Buffer.from(data, "hex"),
		});

		// console.log(result);
		if (!result.success) {
			this.app.terminate("getActiveValidators failed");
		}

		const totalSupply = Utils.supplyCalculator.calculateSupply(store.getLastHeight(), this.configuration);
		const [validators] = iface.decodeFunctionResult("getActiveValidators", result.output!);

		const validatorWallets: Contracts.State.ValidatorWallet[] = [];
		for (let i = 0; i < validators.length; i++) {
			const validator = validators[i];

			const [addr, [voteBalance, validatorPublicKey]] = validator;
			// console.log(addr, voteBalance, validatorPublicKey);

			const wallet = store.walletRepository.findByAddress(addr);
			const validatorWallet = this.validatorWalletFactory(wallet);
			validatorWallet.getWallet().setAttribute("validatorVoteBalance", Utils.BigNumber.make(voteBalance));
			validatorWallet.getWallet().setAttribute("validatorPublicKey", validatorPublicKey.slice(2));

			validatorWallet.setRank(i + 1);
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

		return validatorWallets;
	}
}
