import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { Identifiers as EvmConsensusIdentifiers } from "@mainsail/evm-consensus";
import { assert, Sandbox } from "@mainsail/test-framework";
import { BigNumber } from "@mainsail/utils";

import { getAccountByAddressOrPublicKey, getLegacyColdWallets } from "./utils.js";

interface WalletState {
	balance: BigNumber;
	nonce: BigNumber;
}

export const takeSnapshot = async (sandbox: Sandbox): Promise<Snapshot> => {
	const snapshot = new Snapshot(sandbox);
	const instance = sandbox.app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");

	const { accounts } = await instance.getAccounts(0n, 1000n);
	for (const account of accounts) {
		await snapshot.add(account);
	}

	const legacyColdWallets = await getLegacyColdWallets(sandbox);
	for (const { mainsailAddress, legacyColdWallet } of legacyColdWallets) {
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

	public constructor(public sandbox: Sandbox) {
		this.listenForEvmEvents();
	}

	private listenForEvmEvents() {
		const event = Events.EvmEvent.TransactionReceipt;
		const eventDispatcher = this.sandbox.app.get<Contracts.Kernel.EventDispatcher>(
			Identifiers.Services.EventDispatcher.Service,
		);

		const listener = {
			handle: ({
				data,
			}: {
				data: { receipt: Contracts.Evm.TransactionReceipt; sender: string; transactionId: string };
			}) => {
				const { sender, receipt, transactionId } = data;

				console.log("got receipt", sender, transactionId, receipt);
				this.receipts[transactionId] = { receipt, sender };
			},
		};

		eventDispatcher.listen(event, listener);
	}

	public async add(account: Contracts.Evm.AccountInfoExtended): Promise<void> {
		this.states[account.address] = {
			balance: BigNumber.make(account.balance),
			nonce: BigNumber.make(account.nonce),
		};
	}

	public async addLegacyColdWallet(
		mainsailAddress: string,
		legacyWallet: Contracts.Evm.LegacyColdWallet,
	): Promise<void> {
		this.legacyColdWallets[mainsailAddress] = legacyWallet;
	}

	public async addManualDelta(addressOrPublicKey: string, delta: Partial<WalletState>): Promise<void> {
		const account = await getAccountByAddressOrPublicKey({ sandbox: this.sandbox }, addressOrPublicKey);
		if (!this.manualDeltas[account.address]) {
			this.manualDeltas[account.address] = { balance: BigNumber.ZERO, nonce: BigNumber.ZERO };
		}
		const manualDelta = this.manualDeltas[account.address];
		if (delta.balance) {
			manualDelta.balance = manualDelta.balance.plus(delta.balance);
		}
		if (delta.nonce) {
			manualDelta.nonce = manualDelta.nonce.plus(delta.nonce);
		}
	}

	public async validate(): Promise<void> {
		// All account changes from block 0 onwards
		const accountDeltas = await this.collectAccountDeltas();

		// Verify final balance of all wallets matches with delta and snapshot taken at block 0
		const validateBalance = async (account: Contracts.Evm.AccountInfoExtended): Promise<boolean> => {
			const currentBalance = BigNumber.make(account.balance);
			const currentNonce = BigNumber.make(account.nonce);

			const previousState = this.states[account.address] ?? {
				balance: BigNumber.ZERO,
				nonce: BigNumber.ZERO,
			};
			const walletDelta = accountDeltas[account.address] ?? {
				balance: BigNumber.ZERO,
				nonce: BigNumber.ZERO,
			};

			const expected = {
				balance: previousState.balance.plus(walletDelta.balance),
				nonce: previousState.nonce.plus(walletDelta.nonce),
			};

			let ok = true;
			if (!currentBalance.isEqualTo(expected.balance)) {
				// If it doesn't match; the discrepancy must come from a merged legacy cold wallet
				const legacyColdWallet = this.legacyColdWallets[account.address];
				if (
					!legacyColdWallet ||
					!BigNumber.make(legacyColdWallet.balance).isEqualTo(currentBalance.minus(expected.balance))
				) {
					console.log(
						"-- BALANCE MISMATCH",
						account.address,
						"EXPECTED",
						expected.balance.toString(),
						"ACTUAL",
						currentBalance.toString(),
						"DIFF",
						expected.balance.minus(currentBalance).toString(),
					);

					ok = false;
				}
			}

			if (!currentNonce.isEqualTo(expected.nonce)) {
				console.log(
					"-- NONCE MISMATCH",
					account.address,
					"EXPECTED",
					expected.nonce.toString(),
					"ACTUAL",
					currentNonce.toString(),
					"DIFF",
					expected.nonce.minus(currentNonce).toString(),
				);

				ok = false;
			}

			return ok;
		};

		let allValid = true;
		const evm = this.sandbox.app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");
		const { accounts } = await evm.getAccounts(0n, 1000n);
		for (const account of accounts) {
			if (!(await validateBalance(account))) {
				allValid = false;
			}
		}

		if (!allValid) {
			process.exit(1);
		}

		assert.true(allValid);
	}

	private async collectAccountDeltas(): Promise<Record<string, WalletState>> {
		const database = this.sandbox.app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service);

		const stateDeltas: Record<string, WalletState> = {};
		if (database.isEmpty()) {
			return stateDeltas;
		}

		const blocks = await database.findBlocks(0, (await database.getLastCommit()).block.header.height);
		const updateBalanceDelta = async (addressOrPublicKey: string, delta: BigNumber): Promise<void> => {
			const account = await getAccountByAddressOrPublicKey({ sandbox: this.sandbox }, addressOrPublicKey);

			if (!stateDeltas[account.address]) {
				stateDeltas[account.address] = { balance: BigNumber.ZERO, nonce: BigNumber.ZERO };
			}

			stateDeltas[account.address].balance = stateDeltas[account.address].balance.plus(delta);
		};

		const positiveBalanceChange = async (addressOrPublicKey: string, amount: BigNumber): Promise<void> => {
			await updateBalanceDelta(addressOrPublicKey, amount);
		};

		const negativeBalanceChange = async (addressOrPublicKey: string, amount: BigNumber): Promise<void> => {
			await updateBalanceDelta(addressOrPublicKey, amount.times(-1));
		};

		const incrementNonce = async (addressOrPublicKey: string): Promise<void> => {
			const account = await getAccountByAddressOrPublicKey({ sandbox: this.sandbox }, addressOrPublicKey);

			if (!stateDeltas[account.address]) {
				stateDeltas[account.address] = {
					balance: BigNumber.ZERO,
					nonce: BigNumber.ZERO,
				};
			}

			stateDeltas[account.address].nonce = stateDeltas[account.address].nonce.plus(BigNumber.ONE);
		};

		for (const block of blocks) {
			let totalValidatorFeeReward = BigNumber.ZERO;

			for (const transaction of block.transactions) {
				const receipt = this.receipts[transaction.id!];
				if (receipt) {
					const consumedGas = this.sandbox.app
						.get<Contracts.BlockchainUtils.FeeCalculator>(Identifiers.BlockchainUtils.FeeCalculator)
						.calculateConsumed(transaction.data.gasPrice, Number(receipt.receipt.gasUsed));
					console.log(
						"found receipt with",
						receipt.sender,
						receipt.receipt.gasUsed,
						transaction.data.gasPrice,
						consumedGas,
					);

					totalValidatorFeeReward = totalValidatorFeeReward.plus(consumedGas);

					// subtract fee and increase nonce of sender
					await negativeBalanceChange(receipt.sender, consumedGas);
					await incrementNonce(receipt.sender);

					if (receipt.receipt.deployedContractAddress) {
						// As per EIP-161, the initial nonce for a new contract starts at 1 and not 0.
						//
						// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-161.md#specification
						await incrementNonce(receipt.receipt.deployedContractAddress);
					}

					// add transferred value to recipient (if any)
					if (transaction.data.recipientAddress && transaction.data.value.isGreaterThan(0)) {
						await negativeBalanceChange(receipt.sender, transaction.data.value);
						await positiveBalanceChange(transaction.data.recipientAddress, transaction.data.value);
					}
				}
			}

			// each block increases nonce of internal address due to vote&reward updates
			await incrementNonce(this.sandbox.app.get<string>(EvmConsensusIdentifiers.Internal.Addresses.Deployer));

			// Validator balance
			await positiveBalanceChange(
				block.header.generatorAddress,
				block.header.reward.plus(totalValidatorFeeReward),
			);
		}

		for (const [address, delta] of Object.entries(this.manualDeltas)) {
			if (!stateDeltas[address]) {
				stateDeltas[address] = {
					balance: BigNumber.ZERO,
					nonce: BigNumber.ZERO,
				};
			}

			const stateDelta = stateDeltas[address];
			stateDelta.balance = stateDelta.balance.plus(delta.balance);
			stateDelta.nonce = stateDelta.nonce.plus(delta.nonce);
		}

		return stateDeltas;
	}
}
