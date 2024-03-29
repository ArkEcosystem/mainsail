import { Contracts, Identifiers } from "@mainsail/contracts";
import { assert, Sandbox } from "@mainsail/test-framework";
import { BigNumber } from "@mainsail/utils";

import { getWalletByAddressOrPublicKey } from "./utils.js";

export const takeSnapshot = async (sandbox: Sandbox): Promise<Snapshot> => {
	const snapshot = new Snapshot(sandbox);
	const { walletRepository } = sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	for (const wallet of walletRepository.allByPublicKey()) {
		await snapshot.add(wallet.getPublicKey()!);
	}

	for (const wallet of walletRepository.allByAddress()) {
		await snapshot.add(wallet.getAddress()!);
	}

	return snapshot;
};

export class Snapshot {
	private balances: Record<string, BigNumber> = {};

	public constructor(public sandbox: Sandbox) {}

	public async add(addressOrPublicKey: string): Promise<void> {
		const wallet = await getWalletByAddressOrPublicKey(this.sandbox, addressOrPublicKey);
		this.balances[wallet.getAddress()] = wallet.getBalance();
	}

	public async validate(): Promise<void> {
		const { walletRepository } = this.sandbox.app
			.get<Contracts.State.Service>(Identifiers.State.Service)
			.getStore();

		// All balance changes from block 1 onwards
		const balanceDeltas = await this.collectBalanceDeltas();

		// Verify final balance of all wallets matches with delta and snapshot taken at block 0
		const seenAddresses = new Map<string, boolean>();
		const validateBalance = async (wallet: Contracts.State.Wallet): Promise<boolean> => {
			const currentBalance = wallet.getBalance();

			if (seenAddresses.has(wallet.getAddress())) {
				return seenAddresses.get(wallet.getAddress())!;
			}

			const previousBalance = this.balances[wallet.getAddress()] ?? BigNumber.ZERO;
			const balanceDelta = balanceDeltas[wallet.getAddress()] ?? BigNumber.ZERO;

			const expectedBalance = previousBalance.plus(balanceDelta);

			let ok = true;
			if (!currentBalance.isEqualTo(expectedBalance)) {
				console.log(
					"-- BALANCE MISMATCH",
					wallet.getAddress(),
					"EXPECTED",
					expectedBalance.toString(),
					"ACTUAL",
					currentBalance.toString(),
					"DIFF",
					expectedBalance.minus(currentBalance).toString(),
				);

				ok = false;
			}

			seenAddresses.set(wallet.getAddress(), ok);
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

		assert.true(allValid);
	}

	private async collectBalanceDeltas(): Promise<Record<string, BigNumber>> {
		const database = this.sandbox.app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service);

		const balanceDeltas: Record<string, BigNumber> = {};
		if (database.isEmpty()) {
			return balanceDeltas;
		}

		const blocks = await database.findBlocks(0, (await database.getLastCommit()).block.header.height);
		const positiveBalanceChange = async (addressOrPublicKey: string, amount: BigNumber): Promise<void> => {
			const wallet = await getWalletByAddressOrPublicKey(this.sandbox, addressOrPublicKey);

			if (!balanceDeltas[wallet.getAddress()]) {
				balanceDeltas[wallet.getAddress()] = BigNumber.ZERO;
			}

			balanceDeltas[wallet.getAddress()] = balanceDeltas[wallet.getAddress()].plus(amount);
		};

		const negativeBalanceChange = async (addressOrPublicKey: string, amount: BigNumber): Promise<void> => {
			const wallet = await getWalletByAddressOrPublicKey(this.sandbox, addressOrPublicKey);

			if (!balanceDeltas[wallet.getAddress()]) {
				balanceDeltas[wallet.getAddress()] = BigNumber.ZERO;
			}

			balanceDeltas[wallet.getAddress()] = balanceDeltas[wallet.getAddress()].minus(amount);
		};

		for (const block of blocks) {
			// Validator balance
			await positiveBalanceChange(
				block.header.generatorPublicKey,
				block.header.reward.plus(block.header.totalFee),
			);

			for (const transaction of block.transactions) {
				// Take amount and fee from sender
				await negativeBalanceChange(
					transaction.data.senderPublicKey,
					transaction.data.amount.plus(transaction.data.fee),
				);

				// Add amount to recipient
				if (transaction.data.recipientId) {
					await positiveBalanceChange(transaction.data.recipientId, transaction.data.amount);
				}

				// multi payment
				for (const payment of transaction.data.asset?.payments ?? []) {
					await positiveBalanceChange(payment.recipientId, payment.amount);
				}
			}
		}

		return balanceDeltas;
	}
}
