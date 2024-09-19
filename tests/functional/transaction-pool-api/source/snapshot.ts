import { Contracts, Identifiers, Events } from "@mainsail/contracts";
import { Identifiers as EvmConsensusIdentifiers } from "@mainsail/evm-consensus";
import { assert, Sandbox } from "@mainsail/test-framework";
import { BigNumber } from "@mainsail/utils";

import { getWalletByAddressOrPublicKey } from "./utils.js";

export const takeSnapshot = async (sandbox: Sandbox): Promise<Snapshot> => {
	const snapshot = new Snapshot(sandbox);
	const { walletRepository } = sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	for (const wallet of walletRepository.allByAddress()) {
		await snapshot.add(wallet.getAddress()!);
	}

	return snapshot;
};

interface WalletState {
	balance: BigNumber;
	nonce: BigNumber;
}

export class Snapshot {
	private states: Record<string, WalletState> = {};
	private receipts: Record<string, { sender: string; receipt: Contracts.Evm.TransactionReceipt }[]> = {};
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

				if (!this.receipts[transactionId]) {
					this.receipts[transactionId] = [];
				}

				this.receipts[transactionId].push({ sender, receipt });
			},
		};

		eventDispatcher.listen(event, listener);
	}

	public async add(addressOrPublicKey: string): Promise<void> {
		const wallet = await getWalletByAddressOrPublicKey({ sandbox: this.sandbox }, addressOrPublicKey);
		this.states[wallet.getAddress()] = { balance: wallet.getBalance(), nonce: wallet.getNonce() };
	}

	public async addManualDelta(addressOrPublicKey: string, delta: Partial<WalletState>): Promise<void> {
		const wallet = await getWalletByAddressOrPublicKey({ sandbox: this.sandbox }, addressOrPublicKey);

		if (!this.manualDeltas[wallet.getAddress()]) {
			this.manualDeltas[wallet.getAddress()] = { balance: BigNumber.ZERO, nonce: BigNumber.ZERO };
		}

		const manualDelta = this.manualDeltas[wallet.getAddress()];
		if (delta.balance) {
			manualDelta.balance = manualDelta.balance.plus(delta.balance);
		}
		if (delta.nonce) {
			manualDelta.nonce = manualDelta.nonce.plus(delta.nonce);
		}
	}

	public async validate(): Promise<void> {
		const { walletRepository } = this.sandbox.app
			.get<Contracts.State.Service>(Identifiers.State.Service)
			.getStore();

		// All wallet changes from block 1 onwards
		const walletDeltas = await this.collectWalletDeltas();

		// Verify final balance of all wallets matches with delta and snapshot taken at block 0
		const validateBalance = async (wallet: Contracts.State.Wallet): Promise<boolean> => {
			const currentBalance = wallet.getBalance();
			const currentNonce = wallet.getNonce();

			const previousState = this.states[wallet.getAddress()] ?? {
				balance: BigNumber.ZERO,
				nonce: BigNumber.ZERO,
			};
			const walletDelta = walletDeltas[wallet.getAddress()] ?? {
				balance: BigNumber.ZERO,
				nonce: BigNumber.ZERO,
			};

			const expected = {
				balance: previousState.balance.plus(walletDelta.balance),
				nonce: previousState.nonce.plus(walletDelta.nonce),
			};

			let ok = true;
			if (!currentBalance.isEqualTo(expected.balance)) {
				console.log(
					"-- BALANCE MISMATCH",
					wallet.getAddress(),
					"EXPECTED",
					expected.balance.toString(),
					"ACTUAL",
					currentBalance.toString(),
					"DIFF",
					expected.balance.minus(currentBalance).toString(),
				);

				ok = false;
			}

			if (!currentNonce.isEqualTo(expected.nonce)) {
				console.log(
					"-- NONCE MISMATCH",
					wallet.getAddress(),
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
		for (const wallet of walletRepository.allByPublicKey()) {
			if (!(await validateBalance(wallet))) {
				allValid = false;
			}
		}

		for (const wallet of walletRepository.allByAddress()) {
			if (!(await validateBalance(wallet))) {
				allValid = false;
			}
		}

		if (!allValid) {
			process.exit(1);
		}

		assert.true(allValid);
	}

	private async collectWalletDeltas(): Promise<Record<string, WalletState>> {
		const database = this.sandbox.app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service);
		const gasFeeCalculator = this.sandbox.app.get<Contracts.Evm.GasFeeCalculator>(
			Identifiers.Evm.Gas.FeeCalculator,
		);

		const stateDeltas: Record<string, WalletState> = {};
		if (database.isEmpty()) {
			return stateDeltas;
		}

		const blocks = await database.findBlocks(0, (await database.getLastCommit()).block.header.height);
		const updateBalanceDelta = async (addressOrPublicKey: string, delta: BigNumber): Promise<void> => {
			const wallet = await getWalletByAddressOrPublicKey({ sandbox: this.sandbox }, addressOrPublicKey);

			if (!stateDeltas[wallet.getAddress()]) {
				stateDeltas[wallet.getAddress()] = { balance: BigNumber.ZERO, nonce: BigNumber.ZERO };
			}

			stateDeltas[wallet.getAddress()].balance = stateDeltas[wallet.getAddress()].balance.plus(delta);
		};

		const positiveBalanceChange = async (addressOrPublicKey: string, amount: BigNumber): Promise<void> => {
			await updateBalanceDelta(addressOrPublicKey, amount);
		};

		const negativeBalanceChange = async (addressOrPublicKey: string, amount: BigNumber): Promise<void> => {
			await updateBalanceDelta(addressOrPublicKey, amount.times(-1));
		};

		const incrementNonce = async (addressOrPublicKey: string): Promise<void> => {
			const wallet = await getWalletByAddressOrPublicKey({ sandbox: this.sandbox }, addressOrPublicKey);

			if (!stateDeltas[wallet.getAddress()]) {
				stateDeltas[wallet.getAddress()] = {
					balance: BigNumber.ZERO,
					nonce: BigNumber.ZERO,
				};
			}

			stateDeltas[wallet.getAddress()].nonce = stateDeltas[wallet.getAddress()].nonce.plus(BigNumber.ONE);
		};

		for (const block of blocks) {
			let totalValidatorFeeReward = BigNumber.ZERO;

			for (const transaction of block.transactions) {
				const receipts = this.receipts[transaction.id!];
				if (receipts && receipts.length) {
					for (const receipt of receipts) {
						const consumedGas = gasFeeCalculator.calculateConsumed(
							transaction.data.fee,
							Number(receipt.receipt.gasUsed),
						);
						console.log(
							"found receipt with",
							receipt.sender,
							receipt.receipt.gasUsed,
							transaction.data.fee,
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
						if (transaction.data.recipientId && transaction.data.amount.isGreaterThan(0)) {
							await negativeBalanceChange(receipt.sender, transaction.data.amount);
							await positiveBalanceChange(transaction.data.recipientId, transaction.data.amount);
						}
					}
				}
			}

			// each block increases nonce of internal address due to vote&reward updates
			await incrementNonce(this.sandbox.app.get<string>(EvmConsensusIdentifiers.Internal.Addresses.Deployer));

			// Validator balance
			await positiveBalanceChange(
				block.header.generatorPublicKey,
				block.header.reward.plus(totalValidatorFeeReward),
			);
		}

		for (const [address, delta] of Object.entries(this.manualDeltas)) {
			const wallet = await getWalletByAddressOrPublicKey({ sandbox: this.sandbox }, address);

			if (!stateDeltas[wallet.getAddress()]) {
				stateDeltas[wallet.getAddress()] = {
					balance: BigNumber.ZERO,
					nonce: BigNumber.ZERO,
				};
			}

			const stateDelta = stateDeltas[wallet.getAddress()];
			stateDelta.balance = stateDelta.balance.plus(delta.balance);
			stateDelta.nonce = stateDelta.nonce.plus(delta.nonce);
		}

		return stateDeltas;
	}
}
