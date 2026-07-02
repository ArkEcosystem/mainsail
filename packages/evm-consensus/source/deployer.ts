import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ConsensusAbi, ERC1967ProxyAbi, MultiPaymentAbi, UsernamesAbi } from "@mainsail/evm-contracts";
import { Address, encodeDeployData, encodeFunctionData, getCreateAddress, Hex, toBytes } from "viem";

interface ProxyDeployment {
	readonly abi: Record<string, unknown>[];
	readonly addressIdentifier: symbol;
	readonly implementationAddress: string;
	readonly initializerArguments?: readonly unknown[];
	readonly name: string;
	readonly nonce: number;
}

@injectable()
export class Deployer {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.EvmConsensus.DeployerAddress)
	private readonly deployerAddress!: Address;

	@inject(Identifiers.EvmConsensus.GenesisInfo)
	private readonly genesisBlockInfo!: Contracts.Evm.GenesisInfo;

	#nonce = 0;
	#needsCommit = false;

	public async deploy(): Promise<void> {
		const milestone = this.configuration.getMilestone();

		await this.evm.prepareNextCommit({
			blockContext: {
				commitKey: this.#getCommitKey(),
				gasLimit: BigInt(milestone.block.maxGasLimit),
				timestamp: BigInt(this.genesisBlockInfo.timestamp),
				validatorAddress: this.deployerAddress,
			},
		});

		await this.evm.initializeGenesis(this.genesisBlockInfo);

		const consensusAddress = await this.#deployContract(ConsensusAbi.bytecode.object, 0, "Consensus");
		await this.#deployProxy({
			abi: ConsensusAbi.abi,
			addressIdentifier: Identifiers.EvmConsensus.Contracts.Consensus,
			implementationAddress: consensusAddress,
			initializerArguments: [this.configuration.getMilestone().validatorRegistrationFee],
			name: "Consensus",
			nonce: 1,
		});

		const usernamesAddress = await this.#deployContract(UsernamesAbi.bytecode.object, 2, "Usernames");
		await this.#deployProxy({
			abi: UsernamesAbi.abi,
			addressIdentifier: Identifiers.EvmConsensus.Contracts.Usernames,
			implementationAddress: usernamesAddress,
			name: "Usernames",
			nonce: 3,
		});

		const multiPaymentAddress = await this.#deployContract(MultiPaymentAbi.bytecode.object, 4, "MultiPayment");
		await this.#deployProxy({
			abi: MultiPaymentAbi.abi,
			addressIdentifier: Identifiers.EvmConsensus.Contracts.MultiPayment,
			implementationAddress: multiPaymentAddress,
			name: "MultiPayment",
			nonce: 5,
		});

		if (this.#needsCommit) {
			const commitKey = this.#getCommitKey();
			await this.evm.onCommit({
				commitKey,
				getBlock: () => ({ ...commitKey, number: commitKey.blockNumber }),
				setAccountUpdates: () => ({}),
			} as unknown as Contracts.Processor.ProcessableUnit);
		}
	}

	#generateTxHash() :string {
		return this.hashFactory.sha256(Buffer.from(`tx-${this.deployerAddress}-${this.#nonce++}`, "utf8")).toString("hex");
	}

	#getCommitKey(): Contracts.Evm.CommitKey {
		return { blockNumber: BigInt(2 ** 32 + 1), round: BigInt(0) };
	}

	#getSpecId(): Contracts.Evm.SpecId {
		const milestone = this.configuration.getMilestone();
		return milestone.evmSpec;
	}

	async #deployContract(data: string, nonce: number, label: string): Promise<string> {
		const receipt = await this.#processTransaction({
			commitKey: this.#getCommitKey(),
			data: Buffer.from(toBytes(data)),
			from: this.deployerAddress,
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce: BigInt(nonce),
			specId: this.#getSpecId(),
			txHash: this.#generateTxHash(),
			value: 0n,
		});

		if (!receipt.status) {
			throw new Error(`Failed to deploy ${label} contract`);
		}

		if (receipt.contractAddress !== getCreateAddress({ from: this.deployerAddress, nonce: BigInt(nonce) })) {
			throw new Error("Contract address mismatch");
		}

		this.logger.info(`Deployed ${label} contract from ${this.deployerAddress} to ${receipt.contractAddress}`);

		return receipt.contractAddress;
	}

	async #deployProxy(deployment: ProxyDeployment): Promise<void> {
		// Encode the initializer call
		const initializerCalldata = encodeFunctionData({
			abi: deployment.abi,
			args: deployment.initializerArguments,
			functionName: "initialize",
		});

		// Prepare the constructor arguments for the proxy contract
		const deployData = encodeDeployData({
			abi: ERC1967ProxyAbi.abi,
			args: [deployment.implementationAddress, initializerCalldata],
			bytecode: ERC1967ProxyAbi.bytecode.object as Hex,
		});

		const address = await this.#deployContract(deployData, deployment.nonce, `${deployment.name} PROXY`);

		if (address !== this.app.get<string>(deployment.addressIdentifier)) {
			throw new Error("Contract address mismatch");
		}

		this.#emitContractDeployed({
			activeImplementation: deployment.implementationAddress,
			address,
			implementations: [{ abi: deployment.abi, address: deployment.implementationAddress }],
			name: deployment.name,
			proxy: "UUPS",
		});
	}

	#emitContractDeployed(event: Contracts.Evm.DeployerContract): void {
		void this.events.dispatch(Events.DeployerEvent.ContractCreated, event);
	}

	async #processTransaction(context: Contracts.Evm.TransactionContext): Promise<Contracts.Evm.TransactionReceipt> {
		const { receipt } = await this.evm.getReceipt(this.#getCommitKey().blockNumber, context.txHash);
		if (receipt) {
			return receipt;
		}

		const result = await this.evm.process(context);

		this.#needsCommit = true;

		return result.receipt;
	}
}
