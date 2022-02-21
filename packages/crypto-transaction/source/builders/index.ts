import { DelegateRegistrationBuilder } from "./delegate-registration";
import { DelegateResignationBuilder } from "./delegate-resignation";
import { MultiPaymentBuilder } from "./multi-payment";
import { MultiSignatureBuilder } from "./multi-signature";
import { TransferBuilder } from "./transfer";
import { VoteBuilder } from "./vote";

export * from "./transaction";

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
