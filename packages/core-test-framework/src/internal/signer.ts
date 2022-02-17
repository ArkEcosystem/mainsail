import { Identities, Managers, Transactions, Utils } from "@arkecosystem/crypto";

export class Signer {
	private nonce: Utils.BigNumber;

	public constructor(config, nonce: string) {
		Managers.configManager.setConfig(config);

		this.nonce = Utils.BigNumber.make(nonce || 0);
	}

	public makeTransfer(opts: Record<string, any>): any {
		const transaction = Transactions.BuilderFactory.transfer()
			.fee(this.toSatoshi(opts.transferFee))
			.nonce(this.nonce.toString())
			.recipientId(opts.recipient)
			.amount(this.toSatoshi(opts.amount));

		if (opts.vendorField) {
			transaction.vendorField(opts.vendorField);
		}

		transaction.sign(opts.passphrase);

		this.incrementNonce();
		return transaction.getStruct();
	}

	public makeDelegate(opts: Record<string, any>): any {
		const transaction = Transactions.BuilderFactory.delegateRegistration()
			.fee(this.toSatoshi(opts.delegateFee))
			.nonce(this.nonce.toString())
			.usernameAsset(opts.username)
			.sign(opts.passphrase);

		this.incrementNonce();
		return transaction.getStruct();
	}

	public makeVote(opts: Record<string, any>): any {
		const transaction = Transactions.BuilderFactory.vote()
			.fee(this.toSatoshi(opts.voteFee))
			.nonce(this.nonce.toString())
			.votesAsset([`+${opts.delegate}`])
			.sign(opts.passphrase);

		this.incrementNonce();
		return transaction.getStruct();
	}

	public makeMultiSignatureRegistration(opts: Record<string, any>): any {
		const transaction = Transactions.BuilderFactory.multiSignature()
			.multiSignatureAsset({
				min: opts.min,
				publicKeys: opts.participants.split(","),
			})
			.senderPublicKey(Identities.PublicKey.fromPassphrase(opts.passphrase))
			.nonce(this.nonce.toString());

		for (const [index, passphrase] of opts.passphrases.split(",").entries()) {
			transaction.multiSign(passphrase, index);
		}

		transaction.sign(opts.passphrase);

		this.incrementNonce();
		return transaction.getStruct();
	}

	public makeMultipayment(opts: Record<string, any>): any {
		const transaction = Transactions.BuilderFactory.multiPayment()
			.fee(this.toSatoshi(opts.multipaymentFee))
			.nonce(this.nonce.toString());

		for (const payment of opts.payments) {
			transaction.addPayment(payment.recipientId, payment.amount);
		}

		transaction.sign(opts.passphrase);

		this.incrementNonce();
		return transaction.getStruct();
	}

	private incrementNonce(): void {
		this.nonce = this.nonce.plus(1);
	}

	private toSatoshi(value): string {
		return Utils.BigNumber.make(value * 1e8).toFixed();
	}
}
