import "jest-extended";

import { Generators } from "@packages/core-test-framework/src";
import passphrases from "@packages/core-test-framework/src/internal/passphrases.json";
import { Signer } from "@packages/core-test-framework/src/internal/signer";
import { Identities, Interfaces } from "@packages/crypto";

let signer: Signer;
const config = Generators.generateCryptoConfigRaw();

beforeEach(() => {
	signer = new Signer(config, "0");
});

describe("Signer", () => {
	it("should make transfer", async () => {
		const options = {
			transferFee: "5",
			recipient: Identities.Address.fromPassphrase(passphrases[2]),
			amount: "100",
			passphrase: passphrases[0],
			vendorField: "dummy",
		};

		const entity: Interfaces.ITransactionData = signer.makeTransfer(options);

		expect(entity.signature).toBeDefined();
		expect(entity.vendorField).toBeDefined();
	});

	it("should make transfer with second signature", async () => {
		const options = {
			transferFee: "5",
			recipient: Identities.Address.fromPassphrase(passphrases[2]),
			amount: "100",
			passphrase: passphrases[0],
			vendorField: "dummy",
		};

		const entity: Interfaces.ITransactionData = signer.makeTransfer(options);

		expect(entity.signature).toBeDefined();
		expect(entity.vendorField).toBeDefined();
	});

	it("should make delegate", async () => {
		const options = {
			delegateFee: "5",
			username: "dummy",
			passphrase: passphrases[0],
		};

		const entity: Interfaces.ITransactionData = signer.makeDelegate(options);

		expect(entity.signature).toBeDefined();
		expect(entity.asset?.delegate?.username).toBeString();
	});

	it("should make delegate with second signature", async () => {
		const options = {
			delegateFee: "5",
			username: "dummy",
			passphrase: passphrases[0],
		};

		const entity: Interfaces.ITransactionData = signer.makeDelegate(options);

		expect(entity.signature).toBeDefined();
		expect(entity.asset?.delegate?.username).toBeString();
	});

	it("should make vote", async () => {
		const options = {
			voteFee: "5",
			delegate: Identities.PublicKey.fromPassphrase(passphrases[3]),
			passphrase: passphrases[0],
		};

		const entity: Interfaces.ITransactionData = signer.makeVote(options);

		expect(entity.signature).toBeDefined();
		expect(entity.asset?.votes).toBeArray();
	});

	it("should make vote with second signature", async () => {
		const options = {
			voteFee: "5",
			delegate: Identities.PublicKey.fromPassphrase(passphrases[3]),
			passphrase: passphrases[0],
		};

		const entity: Interfaces.ITransactionData = signer.makeVote(options);

		expect(entity.signature).toBeDefined();
		expect(entity.asset?.votes).toBeArray();
	});

	it("should make multi signature registration", async () => {
		const options = {
			min: 2,
			participants: `${Identities.PublicKey.fromPassphrase(passphrases[0])},${Identities.PublicKey.fromPassphrase(
				passphrases[1],
			)},${Identities.PublicKey.fromPassphrase(passphrases[2])}`,
			passphrases: `${passphrases[0]},${passphrases[1]},${passphrases[2]}`,
			passphrase: passphrases[0],
		};

		const entity: Interfaces.ITransactionData = signer.makeMultiSignatureRegistration(options);

		expect(entity.signature).toBeDefined();
		expect(entity.signatures).toBeArray();
		expect(entity.asset?.multiSignature?.min).toBeNumber();
		expect(entity.asset?.multiSignature?.publicKeys).toBeArray();
	});

	it("should make multi signature registration with second signature", async () => {
		const options = {
			min: 2,
			participants: `${Identities.PublicKey.fromPassphrase(passphrases[0])},${Identities.PublicKey.fromPassphrase(
				passphrases[1],
			)},${Identities.PublicKey.fromPassphrase(passphrases[2])}`,
			passphrases: `${passphrases[0]},${passphrases[1]},${passphrases[2]}`,
			passphrase: passphrases[0],
		};

		const entity: Interfaces.ITransactionData = signer.makeMultiSignatureRegistration(options);

		expect(entity.signature).toBeDefined();
		expect(entity.signatures).toBeArray();
		expect(entity.asset?.multiSignature?.min).toBeNumber();
		expect(entity.asset?.multiSignature?.publicKeys).toBeArray();
	});

	it("should make multi payment", async () => {
		const options = {
			multipaymentFee: "5",
			payments: [
				{
					recipientId: Identities.Address.fromPassphrase(passphrases[0]),
					amount: "2",
				},
				{
					recipientId: Identities.Address.fromPassphrase(passphrases[1]),
					amount: "3",
				},
			],
			passphrase: passphrases[0],
		};

		const entity: Interfaces.ITransactionData = signer.makeMultipayment(options);

		expect(entity.signature).toBeDefined();
		expect(entity.asset?.payments).toBeArray();
	});

	it("should make multi payment with second signature", async () => {
		const options = {
			multipaymentFee: "5",
			payments: [
				{
					recipientId: Identities.Address.fromPassphrase(passphrases[0]),
					amount: "2",
				},
				{
					recipientId: Identities.Address.fromPassphrase(passphrases[1]),
					amount: "3",
				},
			],
			passphrase: passphrases[0],
		};

		const entity: Interfaces.ITransactionData = signer.makeMultipayment(options);

		expect(entity.signature).toBeDefined();
		expect(entity.asset?.payments).toBeArray();
	});
});
