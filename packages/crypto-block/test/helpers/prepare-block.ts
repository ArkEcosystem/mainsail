import { Contracts, Identifiers } from "@mainsail/contracts";
import { EvmCallBuilder } from "@mainsail/crypto-transaction-evm-call";
import { BigNumber } from "@mainsail/utils";

import { BlockFactory } from "../../source/factory.js";

// Function to generate test data
export const prepareBlock = async (context) => {
	const builder = context.sandbox.app.resolve(EvmCallBuilder);

	const tx1 = await (
		await builder
			.gasPrice(5000000000)
			.gasLimit(1_000_000)
			.nonce(0)
			.recipientAddress("0xBe89811e15f611C1db12e59679b6F3DC1F430155")
			.value("0")
			.payload("")
			.sign(
				"protect insect asset weapon later capital stage blossom reject tell apart unusual unfold never gas vehicle aim concert vote gain finger army liberty follow",
			)
	).build();

	const tx2 = await (
		await builder
			.gasPrice(5000000000)
			.gasLimit(1_000_000)
			.nonce(1)
			.recipientAddress("0xBe89811e15f611C1db12e59679b6F3DC1F430155")
			.value("0")
			.payload("")
			.sign(
				"protect insect asset weapon later capital stage blossom reject tell apart unusual unfold never gas vehicle aim concert vote gain finger army liberty follow",
			)
	).build();

	const transactions = [tx1, tx2];

	const totals: { amount: BigNumber; fee: BigNumber; gasUsed: number } = {
		amount: BigNumber.ZERO,
		fee: BigNumber.ZERO,
		gasUsed: 0,
	};
	let payloadLength = transactions.length * 4;
	const payloadBuffers: Buffer[] = [];
	const transactionData: Contracts.Crypto.TransactionData[] = [];

	for (const transaction of transactions) {
		const { data, serialized } = transaction;

		totals.amount = totals.amount.plus(data.value);
		totals.fee = totals.fee.plus(data.gasPrice);
		totals.gasUsed += 1000;

		payloadBuffers.push(Buffer.from(data.id, "hex"));
		transactionData.push(data);
		payloadLength += serialized.length;
	}

	const block = await context.sandbox.app.resolve(BlockFactory).make(
		{
			generatorAddress: "0xB559F4FbB75c378CDd3Dd7CcbFeff9c5c2094E55",
			height: 2,
			numberOfTransactions: transactions.length,
			payloadHash: (
				await context.sandbox.app.get(Identifiers.Cryptography.Hash.Factory).sha256(payloadBuffers)
			).toString("hex"),
			payloadLength,
			previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
			reward: BigNumber.ZERO,
			round: 1,
			stateHash: "0000000000000000000000000000000000000000000000000000000000000000",
			timestamp: 1_703_128_709_748,
			totalAmount: totals.amount,
			totalFee: totals.fee,
			totalGasUsed: totals.gasUsed,
			transactions: transactionData,
			version: 1,
		},
		transactions,
	);

	console.log(block);
	console.log(block.transactions);
};
