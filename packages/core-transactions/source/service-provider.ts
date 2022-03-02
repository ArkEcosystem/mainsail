import { Container, Providers, Services } from "@arkecosystem/core-kernel";
import { Identifiers } from "@arkecosystem/core-contracts";

import { One, TransactionHandlerConstructor } from "./handlers";
import { TransactionHandlerProvider } from "./handlers/handler-provider";
import { TransactionHandlerRegistry } from "./handlers/handler-registry";

export class ServiceProvider extends Providers.ServiceProvider {
	public static getTransactionHandlerConstructorsBinding(): (
		context: Container.interfaces.Context,
	) => TransactionHandlerConstructor[] {
		return (context: Container.interfaces.Context) => {
			type BindingDictionary = Container.interfaces.Lookup<Container.interfaces.Binding<unknown>>;
			const handlerConstructors: TransactionHandlerConstructor[] = [];
			let container: Container.interfaces.Container | null = context.container;

			do {
				const bindingDictionary = container["_bindingDictionary"] as BindingDictionary;
				const handlerBindings = bindingDictionary.getMap().get(Identifiers.TransactionHandler) ?? [];

				for (const handlerBinding of handlerBindings) {
					if (handlerBinding.implementationType) {
						handlerConstructors.push(handlerBinding.implementationType as TransactionHandlerConstructor);
					}
				}

				container = container.parent;
			} while (container);

			return handlerConstructors;
		};
	}

	public async register(): Promise<void> {
		this.app
			.bind<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes)
			.to(Services.Attributes.AttributeSet)
			.inSingletonScope();

		this.app.bind(Identifiers.TransactionHandlerProvider).to(TransactionHandlerProvider).inSingletonScope();

		this.app
			.bind(Identifiers.WalletRepository)
			.toConstantValue(null)
			.when(Container.Selectors.anyAncestorOrTargetTaggedFirst("state", "null"));

		this.app.bind(Identifiers.TransactionHandler).to(One.TransferTransactionHandler);
		this.app.bind(Identifiers.TransactionHandler).to(One.DelegateRegistrationTransactionHandler);
		this.app.bind(Identifiers.TransactionHandler).to(One.VoteTransactionHandler);
		this.app.bind(Identifiers.TransactionHandler).to(One.MultiSignatureRegistrationTransactionHandler);
		this.app.bind(Identifiers.TransactionHandler).to(One.MultiPaymentTransactionHandler);
		this.app.bind(Identifiers.TransactionHandler).to(One.DelegateResignationTransactionHandler);

		this.app
			.bind(Identifiers.TransactionHandlerConstructors)
			.toDynamicValue(ServiceProvider.getTransactionHandlerConstructorsBinding());

		this.app.bind(Identifiers.TransactionHandlerRegistry).to(TransactionHandlerRegistry);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
