import { interfaces } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { TransactionHandlerRegistry } from "./handlers/handler-registry.js";
import { TransactionHandlerConstructor, TransactionHandlerProvider } from "./handlers/index.js";

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
				const handlerBindings = bindingDictionary.getMap().get(Identifiers.Transaction.Handler.Instances) ?? [];

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
		this.app.bind(Identifiers.Transaction.Handler.Provider).to(TransactionHandlerProvider).inSingletonScope();

		this.app
			.bind(Identifiers.Transaction.Handler.Constructors)
			.toDynamicValue(ServiceProvider.getTransactionHandlerConstructorsBinding());

		this.app.bind(Identifiers.Transaction.Handler.Registry).to(TransactionHandlerRegistry);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
