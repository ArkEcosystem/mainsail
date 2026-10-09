import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ConsensusAbi, parseTransactionError, UsernamesAbi } from "@mainsail/evm-contracts";
import { Interfaces } from "@mainsail/snapshot-legacy-exporter";
import { assert, chunk, ensureError } from "@mainsail/utils";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { brotliDecompress } from "node:zlib";
import path from "path";
import { encodeFunctionData } from "viem";

const TRANSACTION_GAS_LIMIT = 200_000_000;

@injectable()
export class Importer implements Contracts.Snapshot.LegacyImporter {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Filesystem.Service)
	private readonly fileSystem!: Contracts.Kernel.Filesystem;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.EvmConsensus.DeployerAddress)
	private readonly deployerAddress!: string;

	@inject(Identifiers.EvmConsensus.Contracts.Consensus)
	private readonly consensusContractAddress!: string;

	@inject(Identifiers.EvmConsensus.Contracts.Usernames)
	private readonly usernameContractAddress!: string;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	#prepared = false;
	#imported = false;

	#data = this.#emptyData();

	public get validators(): Contracts.Snapshot.ImportedLegacyValidator[] {
		return this.#data.validators;
	}

	public get snapshotHash(): string {
		return this.#data.snapshotHash;
	}

	public get genesisBlockNumber(): bigint {
		return this.#data.genesisBlockNumber;
	}

	public get previousGenesisBlockHash(): string {
		return this.#data.previousGenesisBlockHash;
	}

	#nonce = 0n;

	public async run(genesisCommit: Contracts.Crypto.Commit): Promise<Contracts.Snapshot.LegacyImportResult> {
		const { block } = genesisCommit;

		const { snapshot } = this.configuration.getMilestone(this.configuration.getGenesisHeight());
		if (!snapshot) {
			throw new Error(`genesis block has parent hash ${block.parentHash} but no snapshot milestone`);
		}

		await this.prepareRestore();

		if (this.snapshotHash !== snapshot.snapshotHash) {
			throw new Error(
				`snapshot hash ${this.snapshotHash} does not match milestone snapshot ${snapshot.snapshotHash}`,
			);
		}

		if (this.previousGenesisBlockHash !== block.parentHash) {
			throw new Error(
				`snapshot chain tip ${this.previousGenesisBlockHash} does not match genesis parent hash ${block.parentHash}`,
			);
		}

		const result = await this.import({
			commitKey: { blockHash: block.hash, blockNumber: BigInt(block.number), round: BigInt(block.round) },
			timestamp: block.timestamp,
		});

		this.logger.info(
			`snapshot import result: ${JSON.stringify({ ...result, initialTotalSupply: result.initialTotalSupply.toString() })}`,
		);

		return result;
	}

	public async prepareRestore(): Promise<void> {
		const milestone = this.configuration.getMilestone(this.configuration.getGenesisHeight());
		assert.defined(milestone.snapshot);

		const snapshotPath = path.join(
			this.app.configPath("snapshot"),
			`${milestone.snapshot.snapshotHash}.compressed`,
		);

		this.logger.info(`Importing genesis snapshot: ${snapshotPath}`);

		return this.prepare(snapshotPath);
	}

	public async prepare(snapshotPath: string): Promise<void> {
		if (this.#prepared) {
			return;
		}

		const snapshot = await this.#readSnapshot(snapshotPath);

		const hash = createHash("sha256");

		hash.update(JSON.stringify(snapshot.chainTip));

		const wallets: Contracts.Snapshot.ImportedLegacyWallet[] = [];
		const voters: Contracts.Snapshot.ImportedLegacyVoter[] = [];
		const validators: Contracts.Snapshot.ImportedLegacyValidator[] = [];

		let foundColdWallets = 0;

		let totalSupply = 0n;

		const publicKeyLookup: Record<string, Contracts.Snapshot.ImportedLegacyWallet> = snapshot.wallets.reduce(
			(accumulator, current) => {
				if (current.publicKey) {
					accumulator[current.publicKey] = current;
				}

				return accumulator;
			},
			{},
		);

		for (const wallet of snapshot.wallets) {
			hash.update(JSON.stringify(wallet));

			// the received balance is based on 8 decimals; convert it to WEI (18 decimals)
			const balance = BigInt(wallet.balance) * BigInt(1e10);

			if (balance < 0) {
				// skip OG genesis wallet
				this.logger.debug(
					`>> skipping wallet ${wallet.arkAddress} with negative balance ${balance.toString()}`,
				);
				continue;
			}

			if (!wallet.publicKey) {
				foundColdWallets++;
			}

			let ethAddress: string | undefined;
			if (wallet.publicKey) {
				assert.defined(wallet.ethAddress);
				ethAddress = wallet.ethAddress;
			}

			wallets.push({
				arkAddress: wallet.arkAddress,
				balance,
				ethAddress,
				legacyAttributes: {
					legacyNonce: BigInt(wallet.legacyNonce),
					multiSignature: wallet.attributes?.["multiSignature"]?.["publicKeys"]
						? (wallet.attributes?.[
								"multiSignature"
							] as Contracts.Snapshot.ImportedLegacyMultiSignatureAttribute)
						: undefined,
					secondPublicKey: (wallet.attributes?.["secondPublicKey"] as string) ?? undefined,
				},
				publicKey: wallet.publicKey,
			});

			if (wallet.attributes?.["vote"]) {
				assert.string(wallet.publicKey);

				const votedWallet = publicKeyLookup[wallet.attributes?.["vote"] as string];
				assert.defined(votedWallet);
				assert.defined(votedWallet.ethAddress);

				voters.push({
					ethAddress,
					vote: votedWallet.ethAddress,
				});
			}

			if (wallet.attributes?.["delegate"]) {
				if (!wallet.publicKey) {
					throw new Error("delegate is missing public key");
				}

				if (!ethAddress) {
					throw new Error("delegate is missing eth address");
				}

				validators.push({
					ethAddress,
					isResigned: wallet.attributes?.["delegate"]["resigned"] ?? false,
					username: wallet.attributes?.["delegate"]["username"],
				});
			}

			totalSupply += balance;
		}

		const calculatedHash = hash.digest("hex");
		if (snapshot.hash !== calculatedHash) {
			throw new Error(`failed to verify snapshot integrity: ${snapshot.hash} - ${calculatedHash}`);
		}

		let genesisBlockNumber = BigInt(snapshot.chainTip.number);
		if (genesisBlockNumber > 0n) {
			genesisBlockNumber += 1n;
		}

		this.logger.info(
			`snapshot stats: ${JSON.stringify({
				coldWallets: foundColdWallets,
				genesisBlockNumber: genesisBlockNumber.toString(),
				resignedValidators: validators.filter(({ isResigned }) => isResigned).length,
				totalSupply: totalSupply.toString(),
				validators: validators.length,
				voters: voters.length,
				wallets: wallets.length,
			})}`,
		);

		this.#data = {
			genesisBlockNumber,
			previousGenesisBlockHash: snapshot.chainTip.hash,
			snapshotHash: calculatedHash,
			totalSupply,
			validators,
			voters,
			wallets,
		};

		this.#prepared = true;
	}

	public async import(
		options: Contracts.Snapshot.LegacyImportOptions,
	): Promise<Contracts.Snapshot.LegacyImportResult> {
		if (!this.#prepared) {
			throw new Error("snapshot is not prepared");
		}

		if (this.#imported) {
			throw new Error("snapshot already imported");
		}

		this.#imported = true;

		await this.evm.prepareNextCommit({
			blockContext: {
				commitKey: options.commitKey,
				gasLimit: BigInt(250_000_000),
				prevrandao: Buffer.alloc(32),
				timestamp: BigInt(options.timestamp),
				validatorAddress: this.deployerAddress,
			},
		});

		const deployerAccount = await this.evm.getAccountInfo(this.deployerAddress);
		this.#nonce = deployerAccount.nonce;

		// 1) Seed account balances
		await this.#seedWallets();

		// 2) Seed validators
		const importedValidators = await this.#seedValidators(options);

		// 3) Seed voters
		const importedVoters = await this.#seedVoters(options);

		// 4) Seed usernames
		const importedUsernames = await this.#seedUsernames(options);

		return {
			importedUsernames,
			importedValidators,
			importedVoters,
			initialTotalSupply: this.#data.totalSupply,
		};
	}

	public *drain(): Generator<Contracts.Snapshot.ImportedLegacyWallet> {
		while (this.#data.wallets.length > 0) {
			yield this.#data.wallets.pop()!;
		}

		this.dispose();
	}

	public dispose(): void {
		this.#data = this.#emptyData();
		this.#prepared = false;
		this.#imported = false;
	}

	#emptyData(): {
		wallets: Contracts.Snapshot.ImportedLegacyWallet[];
		voters: Contracts.Snapshot.ImportedLegacyVoter[];
		validators: Contracts.Snapshot.ImportedLegacyValidator[];
		snapshotHash: string;
		genesisBlockNumber: bigint;
		previousGenesisBlockHash: string;
		totalSupply: bigint;
	} {
		return {
			genesisBlockNumber: 0n,
			previousGenesisBlockHash: "",
			snapshotHash: "",
			totalSupply: 0n,
			validators: [],
			voters: [],
			wallets: [],
		};
	}

	async #seedWallets(): Promise<void> {
		this.logger.info(`seeding ${this.#data.wallets.length} wallets`);

		const wallets: Contracts.Evm.AccountInfoExtended[] = [];
		const coldWallets: Contracts.Evm.ImportLegacyColdWallet[] = [];

		for (const wallet of this.#data.wallets) {
			if (wallet.ethAddress) {
				wallets.push({
					address: wallet.ethAddress,
					balance: wallet.balance,
					legacyAttributes: wallet.legacyAttributes,
					nonce: 0n,
				});
			} else {
				coldWallets.push({
					address: wallet.arkAddress,
					balance: wallet.balance,
					legacyAttributes: wallet.legacyAttributes,
				});
			}
		}

		for (const batch of chunk(wallets, 1000)) {
			await this.evm.importAccountInfos(batch);
		}

		for (const batch of chunk(coldWallets, 1000)) {
			await this.evm.importLegacyColdWallets(batch);
		}
	}

	async #seedValidators(options: Contracts.Snapshot.LegacyImportOptions): Promise<number> {
		let importedValidators = 0;

		this.logger.info(`seeding ${this.#data.validators.length} validators`);

		for (const validator of this.#data.validators) {
			assert.defined(validator.ethAddress);

			const data = encodeFunctionData({
				abi: ConsensusAbi.abi,
				args: [validator.ethAddress, validator.isResigned],
				functionName: "addValidator",
			}).slice(2);

			const result = await this.evm.process(
				this.#getTransactionContext({
					...options,
					data,
					to: this.consensusContractAddress,
				}),
			);

			if (!result.receipt.status) {
				throw new Error(`failed to add validator ${validator.ethAddress}: ${this.#getError(result.receipt)}`);
			}

			importedValidators++;
		}

		return importedValidators;
	}

	async #seedVoters(options: Contracts.Snapshot.LegacyImportOptions): Promise<number> {
		let importedVoters = 0;

		this.logger.info(`seeding ${this.#data.voters.length} voters`);

		while (this.#data.voters.length > 0) {
			const count = Math.min(1000, this.#data.voters.length);
			const voters = this.#data.voters.splice(this.#data.voters.length - count, count);

			const voterAddresses: string[] = [];
			const validatorAddresses: string[] = [];

			for (const voter of voters) {
				assert.defined(voter.ethAddress);

				voterAddresses.push(voter.ethAddress);
				validatorAddresses.push(voter.vote);
			}

			const data = encodeFunctionData({
				abi: ConsensusAbi.abi,
				args: [voterAddresses, validatorAddresses],
				functionName: "addVotes",
			}).slice(2);

			const result = await this.evm.process(
				this.#getTransactionContext({
					...options,
					data,
					to: this.consensusContractAddress,
				}),
			);

			if (!result.receipt.status) {
				throw new Error(
					`failed to add ${voterAddresses.length} votes starting with ${voterAddresses[0]}: ${this.#getError(result.receipt)}`,
				);
			}

			importedVoters += voterAddresses.length;
		}
		return importedVoters;
	}

	async #seedUsernames(options: Contracts.Snapshot.LegacyImportOptions): Promise<number> {
		this.logger.info(`seeding ${this.#data.validators.length} usernames`);

		let importedUsernames = 0;

		for (const validator of this.#data.validators) {
			if (!validator.username) {
				continue;
			}

			const data = encodeFunctionData({
				abi: UsernamesAbi.abi,
				args: [validator.ethAddress, validator.username],
				functionName: "addUsername",
			}).slice(2);

			const result = await this.evm.process(
				this.#getTransactionContext({
					...options,
					data,
					to: this.usernameContractAddress,
				}),
			);

			if (!result.receipt.status) {
				throw new Error(
					`failed to add username ${validator.username} for ${validator.ethAddress}: ${this.#getError(result.receipt)}`,
				);
			}

			importedUsernames++;
		}

		return importedUsernames;
	}

	#getTransactionContext(
		options: Contracts.Snapshot.LegacyImportOptions & {
			data: string;
			to: string;
		},
	): Contracts.Evm.TransactionContext {
		const { evmSpec } = this.configuration.getMilestone();
		const nonce = this.#nonce;

		return {
			commitKey: options.commitKey,
			data: Buffer.from(options.data, "hex"),
			from: this.deployerAddress,
			gasLimit: BigInt(TRANSACTION_GAS_LIMIT),
			gasPrice: BigInt(0),
			nonce,
			specId: evmSpec,
			to: options.to,
			txHash: this.#generateTxHash(),
			value: 0n,
		} as Contracts.Evm.TransactionContext;
	}

	#getError(receipt: Contracts.Evm.TransactionReceipt): string | undefined {
		return parseTransactionError({ gasLimit: TRANSACTION_GAS_LIMIT } as Contracts.Crypto.Transaction, receipt);
	}

	#generateTxHash = () =>
		this.hashFactory.sha256(Buffer.from(`tx-${this.deployerAddress}-${this.#nonce++}`, "utf8")).toString("hex");

	async #readSnapshot(snapshotPath: string): Promise<Interfaces.LegacySnapshot> {
		try {
			const decompressed = await promisify(brotliDecompress)(await this.fileSystem.get(snapshotPath));
			return JSON.parse(decompressed.toString()) as Interfaces.LegacySnapshot;
		} catch (error) {
			throw new Error(`failed to read snapshot ${snapshotPath}: ${ensureError(error).message}`);
		}
	}
}
