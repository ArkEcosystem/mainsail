import { DelegateRegistrationBuilder } from "./transactions/delegate-registration";
import { DelegateResignationBuilder } from "./transactions/delegate-resignation";
import { MultiPaymentBuilder } from "./transactions/multi-payment";
import { MultiSignatureBuilder } from "./transactions/multi-signature";
import { TransferBuilder } from "./transactions/transfer";
import { VoteBuilder } from "./transactions/vote";

export * from "./transactions/transaction";

export class BuilderFactory {
	public static transfer(): TransferBuilder {
		return new TransferBuilder();
	}

	public static delegateRegistration(): DelegateRegistrationBuilder {
		return new DelegateRegistrationBuilder();
	}

	public static vote(): VoteBuilder {
		return new VoteBuilder();
	}

	public static multiSignature(): MultiSignatureBuilder {
		return new MultiSignatureBuilder();
	}

	public static multiPayment(): MultiPaymentBuilder {
		return new MultiPaymentBuilder();
	}

	public static delegateResignation(): DelegateResignationBuilder {
		return new DelegateResignationBuilder();
	}
}
