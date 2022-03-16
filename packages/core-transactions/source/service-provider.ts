import { interfaces, Selectors } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Providers, Services } from "@arkecosystem/core-kernel";

import { TransactionHandlerConstructor, TransactionHandlerProvider } from "./handlers";
import { TransactionHandlerRegistry } from "./handlers/handler-registry";

export class ServiceProvider extends Providers.ServiceProvider {
	public static getTransactionHandlerConstructorsBinding(): (
		context: interfaces.Context,
	) => TransactionHandlerConstructor[] {
		return (context: interfaces.Context) => {
			type BindingDictionary = interfaces.Lookup<interfaces.Binding<unknown>>;
			const handlerConstructors: TransactionHandlerConstructor[] = [];
			let container: interfaces.Container | null = context.container;

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
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "null"));

		this.app
			.bind(Identifiers.TransactionHandlerConstructors)
			.toDynamicValue(ServiceProvider.getTransactionHandlerConstructorsBinding());

		this.app.bind(Identifiers.TransactionHandlerRegistry).to(TransactionHandlerRegistry);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
