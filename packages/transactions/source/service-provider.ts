import { interfaces } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { assert } from "@mainsail/utils";

import { TransactionHandlerRegistry } from "./handlers/handler-registry.js";
import { TransactionHandlerConstructor, TransactionHandlerProvider } from "./handlers/index.js";
import { TransactionValidator } from "./transaction-validator.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public static getTransactionHandlerConstructorsBinding(): (
		context: Contracts.Kernel.Container.ResolutionContext,
	) => TransactionHandlerConstructor[] {
		return (context: Contracts.Kernel.Container.ResolutionContext) => {
			type BindingDictionary = interfaces.Lookup<interfaces.Binding<unknown>>;
			const handlerConstructors: TransactionHandlerConstructor[] = [];
			let container: Contracts.Kernel.Container.Container | null = context.container;

			assert.defined(container);

			// do {
			// 	const bindingDictionary = container["_bindingDictionary"] as BindingDictionary;
			// 	const handlerBindings = bindingDictionary.getMap().get(Identifiers.Transaction.Handler.Instances) ?? [];

			// 	for (const handlerBinding of handlerBindings) {
			// 		if (handlerBinding.implementationType) {
			// 			handlerConstructors.push(handlerBinding.implementationType as TransactionHandlerConstructor);
			// 		}
			// 	}

			// 	container = container.parent;
			// } while (container);
			// do {
			const bindingDictionary = container["_bindingDictionary"] as BindingDictionary;
			const handlerBindings = bindingDictionary.getMap().get(Identifiers.Transaction.Handler.Instances) ?? [];

			for (const handlerBinding of handlerBindings) {
				if (handlerBinding.implementationType) {
					handlerConstructors.push(handlerBinding.implementationType as TransactionHandlerConstructor);
				}
			}

			// 	container = container.parent;
			// } while (container);

			return handlerConstructors;
		};
	}

	public async register(): Promise<void> {
		this.app.bind(Identifiers.Transaction.Handler.Provider).to(TransactionHandlerProvider).inSingletonScope();

		this.app
			.bind(Identifiers.Transaction.Handler.Constructors)
			.toDynamicValue(ServiceProvider.getTransactionHandlerConstructorsBinding());

		this.app.bind(Identifiers.Transaction.Handler.Registry).to(TransactionHandlerRegistry);

		this.app.bind(Identifiers.Transaction.Validator.Instance).to(TransactionValidator);
		this.app
			.bind<() => TransactionValidator>(Identifiers.Transaction.Validator.Factory)
			.toFactory(
				(context: Contracts.Kernel.Container.ResolutionContext) => () =>
					context.get(Identifiers.Transaction.Validator.Instance),
			);
	}

	public async required(): Promise<boolean> {
		return true;
	}
}
