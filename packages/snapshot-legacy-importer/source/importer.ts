import { createHash } from "node:crypto";

import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Identifiers as EvmConsensusIdentifiers } from "@mainsail/evm-consensus";
import { ConsensusAbi, UsernamesAbi } from "@mainsail/evm-contracts";
import { Interfaces } from "@mainsail/snapshot-legacy-exporter";
import { assert, BigNumber } from "@mainsail/utils";
import { entropyToMnemonic } from "bip39";
import { ethers, sha256 } from "ethers";

@injectable()
export class Importer implements Contracts.Snapshot.LegacyImporter {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Filesystem.Service)
	private readonly fileSystem!: Contracts.Kernel.Filesystem;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Identity.KeyPair.Factory)
	@tagged("type", "consensus")
	private readonly consensusKeyPairFactory!: Contracts.Crypto.KeyPairFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(EvmConsensusIdentifiers.Internal.Addresses.Deployer)
	private readonly deployerAddress!: string;

	#consensusProxyContractAddress!: string;
	#usernamesProxyContractAddress!: string;

	#data: {
		wallets: Contracts.Snapshot.ImportedLegacyWallet[];
		voters: Contracts.Snapshot.ImportedLegacyVoter[];
		validators: Contracts.Snapshot.ImportedLegacyValidator[];
		snapshotHash: string;
		genesisHeight: bigint;
		previousGenesisBlockHash: string;
		totalSupply: bigint;
		result: Contracts.Snapshot.LegacyImportResult | undefined;
	} = {
		genesisHeight: 0n,
		previousGenesisBlockHash: "",
		result: undefined,
		snapshotHash: "",
		totalSupply: 0n,
		validators: [],
		voters: [],
		wallets: [],
	};

	public get voters(): Contracts.Snapshot.ImportedLegacyVoter[] {
		return this.#data.voters;
	}

	public get validators(): Contracts.Snapshot.ImportedLegacyValidator[] {
		return this.#data.validators;
	}

	public get wallets(): Contracts.Snapshot.ImportedLegacyWallet[] {
		return this.#data.wallets;
	}

	public get snapshotHash(): string {
		return this.#data.snapshotHash;
	}

	public get genesisHeight(): bigint {
		return this.#data.genesisHeight;
	}

	public get previousGenesisBlockHash(): string {
		return this.#data.previousGenesisBlockHash;
	}

	public get totalSupply(): bigint {
		return this.#data.totalSupply;
	}

	public get result(): Contracts.Snapshot.LegacyImportResult | undefined {
		return this.#data.result;
	}

	#nonce = 0n;

	public async run(genesisBlock: Contracts.Crypto.Commit): Promise<Contracts.Snapshot.LegacyImportResult> {
		const {
			block: { header },
		} = genesisBlock;

		const milestone = this.configuration.getMilestone(this.configuration.getGenesisHeight());
		assert.defined(milestone.snapshot);

		this.logger.info(`Importing genesis snapshot: ${milestone.snapshot.snapshotHash}`);

		// TODO: fix hardcoded path
		await this.prepare(`./snapshot-${milestone.snapshot.snapshotHash}.json`);

		if (this.snapshotHash !== milestone.snapshot.snapshotHash) {
			throw new Error("imported snapshot hash mismatch");
		}

		if (this.previousGenesisBlockHash !== header.parentHash) {
			throw new Error("genesis block previous block hash mismatch ");
		}

		const result = await this.import({
			commitKey: { height: BigInt(header.number), round: BigInt(header.round) },
			timestamp: header.timestamp,
		});

		this.#data.result = result;

		return result;
	}

	public async prepare(snapshotPath: string): Promise<void> {
		const snapshot = this.fileSystem.readJSONSync<Interfaces.LegacySnapshot>(snapshotPath);

		const hash = createHash("sha256");

		hash.update(JSON.stringify(snapshot.chainTip));

		const wallets: Contracts.Snapshot.ImportedLegacyWallet[] = [];
		const voters: Contracts.Snapshot.ImportedLegacyVoter[] = [];
		const validators: Contracts.Snapshot.ImportedLegacyValidator[] = [];

		let foundColdWallets = 0;

		let totalSupply = 0n;

		for (const wallet of snapshot.wallets) {
			hash.update(JSON.stringify(wallet));

			// the received balance is based on 8 decimals; convert it to WEI (18 decimals)
			const balance = BigNumber.make(wallet.balance).times(1e10).toBigInt();

			if (balance < 0) {
				// skip OG genesis wallet
				this.logger.debug(`>> skipping wallet ${wallet.address} with negative balance ${balance.toString()}`);
				continue;
			}

			if (!wallet.publicKey) {
				foundColdWallets++;
			}

			let ethAddress: string | undefined;
			if (wallet.publicKey) {
				ethAddress = await this.addressFactory.fromPublicKey(wallet.publicKey);
			}

			wallets.push({
				arkAddress: wallet.address,
				balance,
				ethAddress,
				legacyAttributes: {
					multiSignature: wallet.attributes["multiSignature"]?.["publicKeys"]
						? wallet.attributes["multiSignature"]
						: undefined,
					secondPublicKey: wallet.attributes["secondPublicKey"] ?? undefined,
				},
				publicKey: wallet.publicKey,
			});

			if (wallet.attributes["vote"]) {
				assert.string(wallet.publicKey);

				const vote = await this.addressFactory.fromPublicKey(wallet.attributes["vote"]);

				voters.push({
					arkAddress: wallet.address,
					ethAddress,
					publicKey: wallet.publicKey,
					vote,
				});
			}

			if (wallet.attributes["delegate"]) {
				if (!wallet.publicKey) {
					throw new Error("delegate is missing public key");
				}

				validators.push({
					arkAddress: wallet.address,
					blsPublicKey: "TODO", // TODO: get actual bls key; for now it gets replaced by the genesis block generator
					ethAddress,
					isResigned: wallet.attributes["delegate"]["isResigned"] ?? false,
					publicKey: wallet.publicKey,
					username: wallet.attributes["delegate"]["username"],
				});
			}

			totalSupply += balance;
		}

		const calculatedHash = hash.digest("hex");
		if (snapshot.hash !== calculatedHash) {
			throw new Error(`failed to verify snapshot integrity: ${snapshot.hash} - ${calculatedHash}`);
		}

		const genesisHeight = BigInt(snapshot.chainTip.height) + 1n;

		this.logger.info(
			`snapshot stats: ${JSON.stringify({
				coldWallets: foundColdWallets,
				genesisHeight: genesisHeight.toString(),
				totalSupply: totalSupply.toString(),
				validators: validators.length,
				voters: voters.length,
				wallets: wallets.length,
			})}`,
		);

		this.#data = {
			genesisHeight,
			previousGenesisBlockHash: snapshot.chainTip.id,
			result: undefined,
			snapshotHash: calculatedHash,
			totalSupply,
			validators,
			voters,
			wallets,
		};
	}

	public async import(
		options: Contracts.Snapshot.LegacyImportOptions,
	): Promise<Contracts.Snapshot.LegacyImportResult> {
		await this.evm.prepareNextCommit({ commitKey: { height: options.commitKey.height, round: 0n } });

		const deployerAccount = await this.evm.getAccountInfo(this.deployerAddress);
		this.#nonce = deployerAccount.nonce;

		this.#consensusProxyContractAddress = this.app.get<string>(
			EvmConsensusIdentifiers.Contracts.Addresses.Consensus,
		);

		this.#usernamesProxyContractAddress = this.app.get<string>(
			EvmConsensusIdentifiers.Contracts.Addresses.Usernames,
		);

		// 1) Seed account balances
		const totalSupply = await this.#seedWallets(options);

		// 2) Seed validators
		await this.#seedValidators(options);

		// 3) Seed voters
		await this.#seedVoters(options);

		// 4) Seed usernames
		await this.#seedUsernames(options);

		if (totalSupply !== this.totalSupply) {
			throw new Error("totalSupply mismatch");
		}

		return {
			initialTotalSupply: totalSupply,
		};
	}

	async #seedWallets(options: Contracts.Snapshot.LegacyImportOptions): Promise<bigint> {
		let totalSupply = 0n;

		this.logger.info(`seeding ${this.#data.wallets.length} wallets`);

		for (const wallet of this.#data.wallets) {
			if (wallet.ethAddress) {
				await this.evm.importAccountInfo({
					address: wallet.ethAddress,
					balance: wallet.balance,
					legacyAttributes: wallet.legacyAttributes,
					nonce: 0n,
				});
			} else {
				await this.evm.importLegacyColdWallet({
					address: wallet.arkAddress,
					balance: wallet.balance,
					legacyAttributes: wallet.legacyAttributes,
				});
			}

			totalSupply += wallet.balance;
		}

		return totalSupply;
	}

	async #seedValidators(options: Contracts.Snapshot.LegacyImportOptions): Promise<void> {
		const iface = new ethers.Interface(ConsensusAbi.abi);

		this.logger.info(`seeding ${this.#data.validators.length} validators`);

		for (const validator of this.#data.validators) {
			assert.defined(validator.ethAddress);

			// TODO: remove this once the actual BLS keys are available
			if (validator.blsPublicKey === "TODO") {
				const entropy = sha256(Buffer.from(validator.username, "utf8")).slice(2, 34);
				const mnemonic = entropyToMnemonic(Buffer.from(entropy, "hex"));

				const consensusKeyPair = await this.consensusKeyPairFactory.fromMnemonic(mnemonic);
				validator.blsPublicKey = consensusKeyPair.publicKey;
			}

			const data = iface
				.encodeFunctionData("addValidator", [
					validator.ethAddress,
					Buffer.from(validator.blsPublicKey, "hex"),
					validator.isResigned,
				])
				.slice(2);

			const result = await this.evm.process(
				this.#getTransactionContext({
					...options,
					data,
					recipient: this.#consensusProxyContractAddress,
				}),
			);

			if (!result.receipt.success) {
				throw new Error("failed to add validator");
			}
		}
	}

	async #seedVoters(options: Contracts.Snapshot.LegacyImportOptions): Promise<void> {
		const iface = new ethers.Interface(ConsensusAbi.abi);

		const validatorLookup = this.#data.validators.reduce((accumulator, current) => {
			accumulator[current.ethAddress!] = accumulator;
			return accumulator;
		}, {});

		this.logger.info(`seeding ${this.#data.voters.length} voters`);

		for (const voter of this.#data.voters) {
			assert.defined(voter.ethAddress);

			if (!validatorLookup[voter.vote]) {
				this.logger.warning(`!!! skipping voter ${voter.arkAddress} for non-existent validator: ${voter.vote}`);
				continue;
			}

			const data = iface.encodeFunctionData("addVote", [voter.ethAddress, voter.vote]).slice(2);

			const result = await this.evm.process(
				this.#getTransactionContext({
					...options,
					data,
					recipient: this.#consensusProxyContractAddress,
				}),
			);

			if (!result.receipt.success) {
				throw new Error("failed to add vote");
			}
		}
	}

	async #seedUsernames(options: Contracts.Snapshot.LegacyImportOptions): Promise<void> {
		const iface = new ethers.Interface(UsernamesAbi.abi);

		this.logger.info(`seeding ${this.#data.validators.length} usernames`);

		for (const validator of this.#data.validators) {
			if (!validator.username) {
				continue;
			}

			const data = iface.encodeFunctionData("addUsername", [validator.ethAddress, validator.username]).slice(2);

			const result = await this.evm.process(
				this.#getTransactionContext({
					...options,
					data,
					recipient: this.#usernamesProxyContractAddress,
				}),
			);

			if (!result.receipt.success) {
				throw new Error("failed to add username");
			}
		}
	}

	#getTransactionContext(
		options: Contracts.Snapshot.LegacyImportOptions & {
			data: string;
			recipient: string;
		},
	): Contracts.Evm.TransactionContext {
		const { evmSpec } = this.configuration.getMilestone();
		const nonce = this.#nonce;

		return {
			blockContext: {
				commitKey: options.commitKey,
				gasLimit: BigInt(10_000_000),
				timestamp: BigInt(options.timestamp),
				validatorAddress: this.deployerAddress,
			},
			caller: this.deployerAddress,
			data: Buffer.from(options.data, "hex"),
			gasLimit: BigInt(10_000_000),
			gasPrice: BigInt(0),
			nonce,
			recipient: options.recipient,
			specId: evmSpec,
			txHash: this.#generateTxHash(),
			value: 0n,
		} as Contracts.Evm.TransactionContext;
	}

	#generateTxHash = () => sha256(Buffer.from(`tx-${this.deployerAddress}-${this.#nonce++}`, "utf8")).slice(2);
}
