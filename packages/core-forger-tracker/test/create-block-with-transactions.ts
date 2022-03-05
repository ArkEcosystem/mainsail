import { BIP39 } from "../source/methods/bip39";
import { TransactionFactory } from "../../core-test-framework/source";
import { Utils } from "@arkecosystem/crypto";

export const dummy = {
	plainPassphrase: "clay harbor enemy utility margin pretty hub comic piece aerobic umbrella acquire",
	bip38Passphrase: "6PYTQC4c2vBv6PGvV4HibNni6wNsHsGbR1qpL1DfkCNihsiWwXnjvJMU4B",
	publicKey: "03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
	address: "ANBkoGqWeTSiaEVgVzSKZd3jS7UWzv9PSo",
};

export const expectedBlock = {
	version: 0,
	timestamp: 12345689,
	height: 3,
	previousBlock: "11111111",
	numberOfTransactions: 50,
	totalAmount: BigNumber.make(500),
	totalFee: BigNumber.make(500000000),
	reward: BigNumber.make(0),
	payloadLength: 1600,
	generatorPublicKey: "03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
};

export const optionsDefault = {
	timestamp: 12345689,
	previousBlock: {
		id: "11111111",
		height: 2,
	},
	reward: BigNumber.make(0),
};

export const transactions = TransactionFactory.initialize()
	.transfer("DB4gFuDztmdGALMb8i1U4Z4R5SktxpNTAY", 10)
	.withNetwork("devnet")
	.withPassphrase("super cool passphrase")
	.create(50);

export const delegate: BIP39 = new BIP39(dummy.plainPassphrase);

export const forgedBlockWithTransactions = delegate.forge(transactions, optionsDefault);
