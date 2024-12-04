import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { EvmCallBuilder } from "@mainsail/crypto-transaction-evm-call";
import { ConsensusAbi, ERC1967ProxyAbi } from "@mainsail/evm-contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";
import dayjs from "dayjs";
import { ethers, sha256 } from "ethers";

import { Wallet } from "../contracts.js";
import { Generator } from "./generator.js";

@injectable()
export class GenesisBlockGenerator extends Generator {
	@inject(Identifiers.Cryptography.Commit.Serializer)
	private readonly commitSerializer!: Contracts.Crypto.CommitSerializer;

	@inject(Identifiers.Cryptography.Block.Verifier)
	private readonly blockVerifier!: Contracts.Crypto.BlockVerifier;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly transactionVerifier!: Contracts.Crypto.TransactionVerifier;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	#deployerAddress = "0x0000000000000000000000000000000000000001";
	#consensusProxyContractAddress = "0x535B3D7A252fa034Ed71F0C53ec0C6F784cB64E1";

	async generate(
		genesisMnemonic: string,
		validatorsMnemonics: string[],
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
	): Promise<Contracts.Crypto.CommitData> {
		const genesisWallet = await this.createWallet(genesisMnemonic);

		const validators = await Promise.all(
			validatorsMnemonics.map(async (mnemonic) => await this.createWallet(mnemonic)),
		);

		let transactions: Contracts.Crypto.Transaction[] = [];

		if (options.distribute) {
			transactions = transactions.concat(
				...(await this.#createTransferTransactions(
					genesisWallet,
					validators,
					options.premine,
					options.pubKeyHash,
				)),
			);
		} else {
			transactions = transactions.concat(
				await this.#createTransferTransaction(
					genesisWallet,
					genesisWallet,
					options.premine,
					options.pubKeyHash,
				),
			);
		}

		const validatorTransactions = [
			...(await this.#buildValidatorTransactions(validators, options.pubKeyHash)),
			...(await this.#buildVoteTransactions(validators, options.pubKeyHash)),
		];

		transactions = [...transactions, ...validatorTransactions];

		await this.#prepareEvm(genesisWallet.address, validatorsMnemonics.length, options);
		const genesis = await this.#createGenesisCommit(genesisWallet.keys, transactions, options);

		return {
			block: genesis.block.data,
			proof: genesis.proof,
			serialized: genesis.serialized,
		};
	}

	async #prepareEvm(
		genesisWalletAddress: string,
		validatorsCount: number,
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
	) {
		const genesisInfo = {
			account: genesisWalletAddress,
			deployerAccount: this.#deployerAddress,
			initialSupply: Utils.BigNumber.make(options.premine).toBigInt(),
			usernameContract: ethers.getCreateAddress({ from: genesisWalletAddress, nonce: 3 }),
			validatorContract: ethers.getCreateAddress({ from: genesisWalletAddress, nonce: 1 }),
		};
		await this.evm.initializeGenesis(genesisInfo);

		const constructorArguments = new ethers.AbiCoder().encode(["uint8"], [validatorsCount]).slice(2);
		const nonce = BigInt(0);

		// Commit Key chosen in a way such that it does not conflict with blocks.
		const commitKey = { height: BigInt(2 ** 32 + 1), round: BigInt(0) };
		const blockContext = {
			commitKey,
			gasLimit: BigInt(30_000_000),
			timestamp: BigInt(dayjs(options.epoch).valueOf()),
			validatorAddress: this.#deployerAddress,
		};

		const consensusResult = await this.evm.process({
			blockContext,
			caller: this.#deployerAddress,
			data: Buffer.concat([
				Buffer.from(ethers.getBytes(ConsensusAbi.bytecode.object)),
				Buffer.from(constructorArguments, "hex"),
			]),
			gasLimit: BigInt(10_000_000),
			nonce,
			specId: Contracts.Evm.SpecId.SHANGHAI,
			txHash: sha256(Buffer.from(`tx-${this.#deployerAddress}-${0}`, "utf8")).slice(2),
			value: 0n,
		});

		if (!consensusResult.receipt.success) {
			throw new Error("failed to deploy Consensus contract");
		}

		// Logic contract initializer function ABI
		const logicInterface = new ethers.Interface(ConsensusAbi.abi);
		// Encode the initializer call
		const initializerCalldata = logicInterface.encodeFunctionData("initialize");
		// Prepare the constructor arguments for the proxy contract
		const proxyConstructorArguments = new ethers.AbiCoder()
			.encode(["address", "bytes"], [consensusResult.receipt.deployedContractAddress, initializerCalldata])
			.slice(2);

		const proxyResult = await this.evm.process({
			blockContext,
			caller: this.#deployerAddress,
			data: Buffer.concat([
				Buffer.from(ethers.getBytes(ERC1967ProxyAbi.bytecode.object)),
				Buffer.from(proxyConstructorArguments, "hex"),
			]),
			gasLimit: BigInt(10_000_000),
			nonce: BigInt(1),
			specId: Contracts.Evm.SpecId.SHANGHAI,
			txHash: sha256(Buffer.from(`tx-${this.#deployerAddress}-${1}`, "utf8")).slice(2),
			value: 0n,
		});

		if (!proxyResult.receipt.success) {
			throw new Error("failed to deploy Consensus PROXY contract");
		}

		await this.evm.onCommit({
			...commitKey,
			getBlock: () => ({ data: { round: BigInt(0) } }),
			setAccountUpdates: () => ({}),
		} as any);
	}

	async #createTransferTransaction(
		sender: Wallet,
		recipient: Wallet,
		amount: string,
		pubKeyHash: number,
		nonce = 0,
	): Promise<Contracts.Crypto.Transaction> {
		return await (
			await this.app
				.resolve(EvmCallBuilder)
				.network(pubKeyHash)
				.recipientAddress(recipient.address)
				.nonce(nonce.toFixed(0))
				.value(amount)
				.payload("")
				.gasPrice(0)
				.gasLimit(21_000)
				.sign(sender.passphrase)
		).build();
	}

	async #createTransferTransactions(
		sender: Wallet,
		recipients: Wallet[],
		totalPremine: string,
		pubKeyHash: number,
	): Promise<Contracts.Crypto.Transaction[]> {
		const amount: string = BigNumber.make(totalPremine).dividedBy(recipients.length).toString();

		const result: Contracts.Crypto.Transaction[] = [];

		for (const [index, recipient] of recipients.entries()) {
			result.push(await this.#createTransferTransaction(sender, recipient, amount, pubKeyHash, index));
		}

		return result;
	}

	async #buildValidatorTransactions(senders: Wallet[], pubKeyHash: number): Promise<Contracts.Crypto.Transaction[]> {
		const result: Contracts.Crypto.Transaction[] = [];

		const iface = new ethers.Interface(ConsensusAbi.abi);

		for (const [index, sender] of senders.entries()) {
			const data = iface
				.encodeFunctionData("registerValidator", [Buffer.from(sender.consensusKeys.publicKey, "hex")])
				.slice(2);

			result[index] = await (
				await this.app
					.resolve(EvmCallBuilder)
					.network(pubKeyHash)
					.recipientAddress(this.#consensusProxyContractAddress)
					.nonce("0") // validator registration tx is always the first one from sender
					.payload(data)
					.gasPrice(0)
					.gasLimit(500_000)
					.sign(sender.passphrase)
			).build();
		}

		return result;
	}

	async #buildVoteTransactions(senders: Wallet[], pubKeyHash: number): Promise<Contracts.Crypto.Transaction[]> {
		const result: Contracts.Crypto.Transaction[] = [];

		const iface = new ethers.Interface(ConsensusAbi.abi);

		for (const [index, sender] of senders.entries()) {
			const data = iface.encodeFunctionData("vote", [sender.address]).slice(2);

			result[index] = await (
				await this.app
					.resolve(EvmCallBuilder)
					.network(pubKeyHash)
					.recipientAddress(this.#consensusProxyContractAddress)
					.nonce("1") // vote transaction is always the 3rd tx from sender (1st one is validator registration)
					.payload(data)
					.gasPrice(0)
					.gasLimit(200_000)
					.sign(sender.passphrase)
			).build();
		}

		return result;
	}

	async #createGenesisCommit(
		premineKeys: Contracts.Crypto.KeyPair,
		transactions: Contracts.Crypto.Transaction[],
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
	): Promise<Contracts.Crypto.Commit> {
		const genesisBlock = await this.#createGenesisBlock(premineKeys, transactions, options);

		const commit: Contracts.Crypto.CommitSerializable = {
			block: genesisBlock.block,
			proof: { round: 0, signature: "", validators: [] },
		};

		const serialized = await this.commitSerializer.serializeCommit(commit);

		const genesis = {
			...commit,
			serialized: serialized.toString("hex"),
		};

		await this.#ensureValidGenesisBlock(genesis);

		return genesis;
	}

	async #createGenesisBlock(
		keys: Contracts.Crypto.KeyPair,
		transactions: Contracts.Crypto.Transaction[],
		options: Contracts.NetworkGenerator.GenesisBlockOptions,
	): Promise<{ block: Contracts.Crypto.Block; transactions: Contracts.Crypto.TransactionData[] }> {
		const totals: { amount: BigNumber; fee: BigNumber; gasUsed: number } = {
			amount: BigNumber.ZERO,
			fee: BigNumber.ZERO,
			gasUsed: 0,
		};

		const payloadBuffers: Buffer[] = [];

		// The initial payload length takes the overhead for each serialized transaction into account
		// which is a uint16 per transaction to store the individual length.
		let payloadLength = transactions.length * 2;

		const transactionData: Contracts.Crypto.TransactionData[] = [];
		for (const transaction of transactions) {
			const { serialized, data } = transaction;

			Utils.assert.defined<string>(data.id);

			const { receipt } = await this.evm.process({
				blockContext: {
					commitKey: {
						height: BigInt(0),
						round: BigInt(0),
					},
					gasLimit: BigInt(30_000_000),
					timestamp: BigInt(dayjs(options.epoch).valueOf()),
					validatorAddress: this.#deployerAddress,
				},
				caller: transaction.data.senderAddress,
				data: Buffer.from(transaction.data.data, "hex"),
				gasLimit: BigInt(transaction.data.gasLimit),
				gasPrice: BigInt(transaction.data.gasPrice),
				nonce: transaction.data.nonce.toBigInt(),
				recipient: transaction.data.recipientAddress,
				sequence: transaction.data.sequence,
				specId: Contracts.Evm.SpecId.SHANGHAI,
				txHash: transaction.id,
				value: transaction.data.value.toBigInt(),
			});

			totals.amount = totals.amount.plus(data.value);
			totals.fee = totals.fee.plus(data.gasPrice);
			totals.gasUsed += Number(receipt.gasUsed);

			payloadBuffers.push(Buffer.from(data.id, "hex"));
			transactionData.push(data);
			payloadLength += serialized.length;
		}

		return {
			block: await this.app.get<Contracts.Crypto.BlockFactory>(Identifiers.Cryptography.Block.Factory).make(
				{
					generatorAddress: await this.app
						.getTagged<Contracts.Crypto.AddressFactory>(
							Identifiers.Cryptography.Identity.Address.Factory,
							"type",
							"wallet",
						)
						.fromPublicKey(keys.publicKey),
					height: 0,
					numberOfTransactions: transactions.length,
					payloadHash: (
						await this.app
							.get<Contracts.Crypto.HashFactory>(Identifiers.Cryptography.Hash.Factory)
							.sha256(payloadBuffers)
					).toString("hex"),
					payloadLength,
					previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
					reward: BigNumber.ZERO,
					round: 0,
					stateHash: "0000000000000000000000000000000000000000000000000000000000000000",
					timestamp: dayjs(options.epoch).valueOf(),
					totalAmount: totals.amount,
					totalFee: totals.fee,
					totalGasUsed: totals.gasUsed,
					transactions: transactionData,
					version: 1,
				},
				transactions,
			),
			transactions: transactionData,
		};
	}

	async #ensureValidGenesisBlock(genesis: Contracts.Crypto.Commit): Promise<void> {
		const verifiedTransactions = await Promise.all(
			genesis.block.transactions.map((transaction) => this.transactionVerifier.verifyHash(transaction.data)),
		);

		if (verifiedTransactions.includes(false)) {
			throw new Error("genesis block contains invalid transactions");
		}

		const verified = await this.blockVerifier.verify(genesis.block);
		if (!verified.verified) {
			throw new Error(`failed to generate genesis block: ${JSON.stringify(verified.errors)}`);
		}
	}
}
