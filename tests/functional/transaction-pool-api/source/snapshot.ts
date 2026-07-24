import type {
	Contracts as ApiDatabaseContracts,
	Models} from "@mainsail/api-database";
import type { Contracts } from "@mainsail/contracts";

import {
	Identifiers as ApiDatabaseIdentifiers
} from "@mainsail/api-database";
import { Events, Identifiers } from "@mainsail/constants";
import { assert } from "@mainsail/test-runner";
import { parseAbi, parseEventLogs } from "viem";

import { getAccountByAddressOrPublicKey, getLegacyColdWallets } from "./utilities.js";

interface WalletState {
	balance: bigint;
	nonce: bigint;
}

export const takeSnapshot = async (app: Contracts.Kernel.Application): Promise<Snapshot> => {
	const snapshot = new Snapshot(app);
	const instance = app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");

	const { accounts } = await instance.getAccounts(0n, 1000n);
	for (const account of accounts) {
		await snapshot.add(account);
	}

	const legacyColdWallets = await getLegacyColdWallets(app);
	for (const { legacyColdWallet, mainsailAddress } of legacyColdWallets) {
		await snapshot.addLegacyColdWallet(
			mainsailAddress,
			await instance.getAccountInfoExtended(mainsailAddress, legacyColdWallet.address),
		);
	}

	return snapshot;
};

export class Snapshot {
	private states: Record<string, WalletState> = {};
	private legacyColdWallets: Record<string, Contracts.Evm.LegacyColdWallet> = {};
	private receipts: Record<string, { sender: string; receipt: Contracts.Evm.TransactionReceipt }> = {};
	private manualDeltas: Record<string, WalletState> = {};

	public constructor(public app: Contracts.Kernel.Application) {
		this.listenForEvmEvents();
	}

	private listenForEvmEvents() {
		const event = Events.EvmEvent.TransactionReceipt;
		const eventDispatcher = this.app.get<
			Contracts.Kernel.EventDispatcher<{
				receipt: Contracts.Evm.TransactionReceipt;
				sender: string;
				transactionId: string;
			}>
		>(Identifiers.Services.EventDispatcher.Service);

		const listener = {
			handle: async ({
				data,
			}: {
				data: { receipt: Contracts.Evm.TransactionReceipt; sender: string; transactionId: string };
			}): Promise<void> => {
				const { receipt, sender, transactionId } = data;

				console.log("got receipt", sender, transactionId, receipt);
				this.receipts[transactionId] = { receipt, sender };
			},
		};

		eventDispatcher.listen(event, listener);
	}

	public async add(account: Contracts.Evm.AccountInfoExtended): Promise<void> {
		this.states[account.address] = {
			balance: account.balance,
			nonce: account.nonce,
		};
	}

	public async addLegacyColdWallet(
		mainsailAddress: string,
		legacyWallet: Contracts.Evm.LegacyColdWallet,
	): Promise<void> {
		this.legacyColdWallets[mainsailAddress] = legacyWallet;
	}

	public async addManualDelta(addressOrPublicKey: string, delta: Partial<WalletState>): Promise<void> {
		const account = await getAccountByAddressOrPublicKey({ app: this.app }, addressOrPublicKey);
		if (!this.manualDeltas[account.address]) {
			this.manualDeltas[account.address] = { balance: 0n, nonce: 0n };
		}
		const manualDelta = this.manualDeltas[account.address];
		if (delta.balance) {
			manualDelta.balance += delta.balance;
		}
		if (delta.nonce) {
			manualDelta.nonce += delta.nonce;
		}
	}

	public async validate(): Promise<void> {
		await this.app.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service).dispose();
		await this.app.get<Contracts.ApiSync.Service>(Identifiers.ApiSync.Service).flush();

		// All account changes from block 0 onwards
		const { accountDeltas, lastHeight } = await this.collectAccountDeltas();

		const walletRepositoryFactory = this.app.get<ApiDatabaseContracts.WalletRepositoryFactory>(
			ApiDatabaseIdentifiers.WalletRepositoryFactory,
		);

		let totalSupplyDatabase = 0n;
		const databaseWallets = await walletRepositoryFactory().createQueryBuilder().select().getMany();
		const databaseWalletsLookup: Record<string, Models.Wallet> = databaseWallets.reduce((accumulator, current) => {
			totalSupplyDatabase += BigInt(current.balance);
			accumulator[current.address] = current;
			return accumulator;
		}, {});

		// Verify final balance of all wallets matches with delta and snapshot taken at block 0
		const validateBalance = async (account: Contracts.Evm.AccountInfoExtended): Promise<boolean> => {
			const currentBalance = account.balance;
			const currentNonce = account.nonce;

			const previousState = this.states[account.address] ?? {
				balance: 0n,
				nonce: 0n,
			};
			const walletDelta = accountDeltas[account.address] ?? {
				balance: 0n,
				nonce: 0n,
			};

			const expected = {
				balance: previousState.balance + walletDelta.balance,
				nonce: previousState.nonce + walletDelta.nonce,
			};

			let ok = true;
			if (currentBalance !== expected.balance) {
				// If it doesn't match; the discrepancy must come from a merged legacy cold wallet
				const legacyColdWallet = this.legacyColdWallets[account.address];
				if (
					!legacyColdWallet ||
					legacyColdWallet.balance !== (currentBalance - expected.balance))
				{
					console.log(
						"-- BALANCE MISMATCH",
						account.address,
						"EXPECTED",
						expected.balance.toString(),
						"ACTUAL",
						currentBalance.toString(),
						"DIFF",
						(expected.balance - currentBalance).toString(),
					);

					ok = false;
				}
			}

			if (currentNonce !== expected.nonce) {
				console.log(
					"-- NONCE MISMATCH",
					account.address,
					"EXPECTED",
					expected.nonce.toString(),
					"ACTUAL",
					currentNonce.toString(),
					"DIFF",
					(expected.nonce -  currentNonce).toString(),
				);

				ok = false;
			}

			const databaseWallet = databaseWalletsLookup[account.address];
			if (!databaseWallet) {
				console.log("-- DB WALLET NOT FOUND", account.address);

				ok = false;
			} else {
				if (expected.balance !== BigInt(databaseWallet.balance)) {
					// If it doesn't match; the discrepancy must come from a merged legacy cold wallet
					const legacyColdWallet = this.legacyColdWallets[account.address];
					if (
						!legacyColdWallet ||
						legacyColdWallet.balance !== (
							BigInt(databaseWallet.balance) - expected.balance)
						) {
						console.log(
							"-- DB WALLET BALANCE MISMATCH",
							account.address,
							"EXPECTED",
							expected.balance.toString(),
							"ACTUAL",
							databaseWallet.balance,
							"DIFF",
							(expected.balance - BigInt(databaseWallet.balance)).toString(),
						);
						ok = false;
					}
				}

				if (expected.nonce !== BigInt(databaseWallet.nonce)) {
					// Nonce of the internal address is incremented on each block which is suspect
					// to race condition here. Hence it needs special treatment:
					let nonceMismatch = true;
					if (account.address === "0x0000000000000000000000000000000000000001") {
						const dataSource = this.app.get<ApiDatabaseContracts.RepositoryDataSource>(
							ApiDatabaseIdentifiers.DataSource,
						);

						await dataSource.transaction("REPEATABLE READ", async (entityManager) => {
							const deployerDatabaseWallet = await walletRepositoryFactory(entityManager)
								.createQueryBuilder()
								.where("address = :address", { address: account.address })
								.getOneOrFail();

							const blockRepositoryFactory =
								this.app.get<ApiDatabaseContracts.BlockRepositoryFactory>(
									ApiDatabaseIdentifiers.BlockRepositoryFactory,
								);
							const contractRepositoryFactory =
								this.app.get<ApiDatabaseContracts.ContractRepositoryFactory>(
									ApiDatabaseIdentifiers.ContractRepositoryFactory,
								);

							const numberOfBlocks = await blockRepositoryFactory(entityManager)
								.createQueryBuilder()
								.getCount();
							const roundCalculator = this.app.get<Contracts.BlockchainUtils.RoundCalculator>(
								Identifiers.BlockchainUtils.RoundCalculator,
							);
							const { round } = roundCalculator.calculateRound(numberOfBlocks - 1);
							const contracts = await contractRepositoryFactory(entityManager)
								.createQueryBuilder()
								.getMany();
							let numberOfContracts = contracts.length;
							for (const contract of contracts) {
								numberOfContracts += contract.implementations.length;
							}

							// number of blocks (one vote&reward update each)
							// + number of post-genesis blocks (one randao mix each; genesis never mixes)
							// + current round + number of deployed contracts
							const expectedNonce = numberOfBlocks + (numberOfBlocks - 1) + round + numberOfContracts;
							// console.log("-- COMPARING DEPLOYER WALLET", expectedNonce, deployerDbWallet, dbWallet);
							if (BigInt(expectedNonce) === BigInt(deployerDatabaseWallet.nonce)) {
								nonceMismatch = false;
							}
						});
					}

					if (nonceMismatch) {
						console.log(
							"-- DB WALLET NONCE MISMATCH",
							account.address,
							"EXPECTED",
							expected.nonce.toString(),
							"ACTUAL",
							databaseWallet.nonce,
							"DIFF",
							(expected.nonce - BigInt(databaseWallet.nonce)).toString(),
						);
						ok = false;
					}
				}
			}

			return ok;
		};

		let allValid = true;
		let totalSupply = 0n;
		const evm = this.app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");
		const { accounts } = await evm.getAccounts(0n, 1000n);
		for (let account of accounts) {
			// Look up historical values for non contracts
			if ((await evm.codeAt(account.address)) === "0x") {
				const historical = await evm.getAccountInfo(account.address, BigInt(lastHeight));
				account = {
					...account,
					balance: historical.balance,
					nonce: historical.nonce,
				};
			}

			totalSupply += account.balance;

			if (!(await validateBalance(account))) {
				allValid = false;
			}
		}

		// Verify total supply
		const stateRepositoryFactory = this.app.get<ApiDatabaseContracts.StateRepositoryFactory>(
			ApiDatabaseIdentifiers.StateRepositoryFactory,
		);

		const databaseState = await stateRepositoryFactory().createQueryBuilder().select().getOneOrFail();
		if (totalSupply !== BigInt(databaseState.supply) && totalSupply !== totalSupplyDatabase) {
			console.log("-- DB TOTAL SUPPLY MISMATCH", totalSupply, databaseState.supply, totalSupplyDatabase);
			allValid = false;
		}

		if (!allValid) {
			process.exit(1);
		}

		assert.true(allValid);
	}

	private async collectAccountDeltas(): Promise<{ accountDeltas: Record<string, WalletState>; lastHeight: number }> {
		const database = this.app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service);
		const configuration = this.app.get<Contracts.Crypto.Configuration>(
			Identifiers.Cryptography.Configuration,
		);

		const accountDeltas: Record<string, WalletState> = {};
		if (await database.isEmpty()) {
			return { accountDeltas, lastHeight: 0 };
		}

		const blocks = await database.findBlocks(1, Math.max(1, (await database.getLastCommit()).block.number));
		const updateBalanceDelta = async (addressOrPublicKey: string, delta: bigint): Promise<void> => {
			const account = await getAccountByAddressOrPublicKey({ app: this.app }, addressOrPublicKey);

			if (!accountDeltas[account.address]) {
				accountDeltas[account.address] = { balance: 0n, nonce: 0n };
			}

			accountDeltas[account.address].balance = accountDeltas[account.address].balance + delta;
		};

		const positiveBalanceChange = async (addressOrPublicKey: string, amount: bigint): Promise<void> => {
			await updateBalanceDelta(addressOrPublicKey, amount);
		};

		const negativeBalanceChange = async (addressOrPublicKey: string, amount: bigint): Promise<void> => {
			await updateBalanceDelta(addressOrPublicKey, amount * -1n);
		};

		const incrementNonce = async (height: number, addressOrPublicKey: string): Promise<void> => {
			const account = await getAccountByAddressOrPublicKey({ app: this.app }, addressOrPublicKey);

			if (!accountDeltas[account.address]) {
				accountDeltas[account.address] = {
					balance: 0n,
					nonce: 0n,
				};
			}

			accountDeltas[account.address].nonce = accountDeltas[account.address].nonce + 1n;
		};

		for (const block of blocks) {
			let totalValidatorFeeReward = 0n;

			for (const transaction of block.transactions) {
				const receipt = this.receipts[transaction.hash!];
				if (receipt) {
					const consumedGas = this.app
						.get<Contracts.BlockchainUtils.FeeCalculator>(Identifiers.BlockchainUtils.FeeCalculator)
						.calculateConsumed(transaction.gasPrice, receipt.receipt.gasUsed);
					console.log(
						"found receipt with",
						receipt.sender,
						receipt.receipt.gasUsed,
						transaction.gasPrice,
						consumedGas,
					);

					totalValidatorFeeReward = totalValidatorFeeReward + consumedGas;

					// subtract fee and increase nonce of sender
					await negativeBalanceChange(receipt.sender, consumedGas);
					await incrementNonce(block.number, receipt.sender);

					if (receipt.receipt.contractAddress) {
						// As per EIP-161, the initial nonce for a new contract starts at 1 and not 0.
						//
						// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-161.md#specification
						await incrementNonce(block.number, receipt.receipt.contractAddress);
					}

					// add transferred value to recipient (if any)
					if (
						transaction.to &&
						transaction.value > 0n &&
						receipt.receipt.status === 1
					) {
						await negativeBalanceChange(receipt.sender, transaction.value);
						await positiveBalanceChange(transaction.to, transaction.value);
					}

					const consensusContract = this.app.get<string>(
						Identifiers.EvmConsensus.Contracts.Consensus,
					);

					// Refund Validator Fee
					if (transaction.to === consensusContract) {
						const consensusAbi = parseAbi(["event ValidatorResigned(address addr)"] as const);

						const resignations = parseEventLogs({
							abi: consensusAbi,
							eventName: "ValidatorResigned",
							logs: receipt.receipt.logs,
						});

						for (const resignation of resignations) {
							await negativeBalanceChange(
								transaction.to,
								BigInt(configuration.getMilestone().validatorRegistrationFee),
							);
							await positiveBalanceChange(
								resignation.args.addr,
								BigInt(configuration.getMilestone().validatorRegistrationFee),
							);
						}
					}

					// multipayment forwards value to recipients
					const multiPaymentContract = this.app.get<string>(
						Identifiers.EvmConsensus.Contracts.MultiPayment,
					);
					if (transaction.to === multiPaymentContract) {
						const paymentAbi = parseAbi([
							"event Payment(address indexed recipient, uint256 amount, bool success)",
						] as const);

						const payments = parseEventLogs({
							abi: paymentAbi,
							eventName: "Payment",
							logs: receipt.receipt.logs,
						});

						for (const payment of payments) {
							const { amount, recipient, success } = payment.args;
							if (!success) {
								continue;
							}

							await negativeBalanceChange(multiPaymentContract, BigInt(amount));
							await positiveBalanceChange(recipient, BigInt(amount));
						}
					}
				}
			}

			// each block increases the nonce of the internal address twice: once for the
			// vote&reward update and once for the randao mix (both are deployer system calls;
			// genesis is excluded since this loop starts at block 1 and genesis never mixes)
			await incrementNonce(
				block.number,
				this.app.get<string>(Identifiers.EvmConsensus.DeployerAddress),
			);
			await incrementNonce(
				block.number,
				this.app.get<string>(Identifiers.EvmConsensus.DeployerAddress),
			);

			// Validator balance
			await positiveBalanceChange(block.proposer, block.reward + totalValidatorFeeReward);
		}

		for (const [address, delta] of Object.entries(this.manualDeltas)) {
			if (!accountDeltas[address]) {
				accountDeltas[address] = {
					balance: 0n,
					nonce: 0n,
				};
			}

			const stateDelta = accountDeltas[address];
			stateDelta.balance += delta.balance;
			stateDelta.nonce += delta.nonce;
		}

		return { accountDeltas, lastHeight: blocks.at(-1)?.number ?? 0 };
	}
}
