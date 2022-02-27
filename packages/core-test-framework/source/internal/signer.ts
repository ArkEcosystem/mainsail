import { BINDINGS, IConfiguration, IPublicKeyFactory } from "@arkecosystem/core-crypto-contracts";
import { DelegateRegistrationBuilder } from "@arkecosystem/core-crypto-transaction-delegate-registration";
import { MultiPaymentBuilder } from "@arkecosystem/core-crypto-transaction-multi-payment";
import { MultiSignatureBuilder } from "@arkecosystem/core-crypto-transaction-multi-signature-registration";
import { TransferBuilder } from "@arkecosystem/core-crypto-transaction-transfer";
import { VoteBuilder } from "@arkecosystem/core-crypto-transaction-vote";
import { Container } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

export class Signer {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Identity.PublicKeyFactory)
	private readonly publicKeyFactory: IPublicKeyFactory;

	private nonce: BigNumber;

	public constructor(config, nonce: string) {
		this.configuration.setConfig(config);

		this.nonce = BigNumber.make(nonce || 0);
	}

	public makeTransfer(options: Record<string, any>) {
		const transaction = new TransferBuilder()
			.fee(this.toSatoshi(options.transferFee))
			.nonce(this.nonce.toString())
			.recipientId(options.recipient)
			.amount(this.toSatoshi(options.amount));

		if (options.vendorField) {
			transaction.vendorField(options.vendorField);
		}

		transaction.sign(options.passphrase);

		this.incrementNonce();
		return transaction.getStruct();
	}

	public async makeDelegate(options: Record<string, any>) {
		const transaction = await new DelegateRegistrationBuilder()
			.fee(this.toSatoshi(options.delegateFee))
			.nonce(this.nonce.toString())
			.usernameAsset(options.username)
			.sign(options.passphrase);

		this.incrementNonce();
		return transaction.getStruct();
	}

	public async makeVote(options: Record<string, any>) {
		const transaction = await new VoteBuilder()
			.fee(this.toSatoshi(options.voteFee))
			.nonce(this.nonce.toString())
			.votesAsset([`+${options.delegate}`])
			.sign(options.passphrase);

		this.incrementNonce();
		return transaction.getStruct();
	}

	public async makeMultiSignatureRegistration(options: Record<string, any>) {
		const transaction = new MultiSignatureBuilder()
			.multiSignatureAsset({
				min: options.min,
				publicKeys: options.participants.split(","),
			})
			.senderPublicKey(await this.publicKeyFactory.fromMnemonic(options.passphrase))
			.nonce(this.nonce.toString());

		for (const [index, passphrase] of options.passphrases.split(",").entries()) {
			transaction.multiSign(passphrase, index);
		}

		transaction.sign(options.passphrase);

		this.incrementNonce();
		return transaction.getStruct();
	}

	public makeMultipayment(options: Record<string, any>) {
		const transaction = new MultiPaymentBuilder()
			.fee(this.toSatoshi(options.multipaymentFee))
			.nonce(this.nonce.toString());

		for (const payment of options.payments) {
			transaction.addPayment(payment.recipientId, payment.amount);
		}

		transaction.sign(options.passphrase);

		this.incrementNonce();
		return transaction.getStruct();
	}

	private incrementNonce(): void {
		this.nonce = this.nonce.plus(1);
	}

	private toSatoshi(value): string {
		return BigNumber.make(value * 1e8).toFixed();
	}
}
