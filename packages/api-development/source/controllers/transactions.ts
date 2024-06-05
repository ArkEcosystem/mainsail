import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { Controller } from "./controller.js";

@injectable()
export class TransactionsController extends Controller {
	@inject(Identifiers.Transaction.Handler.Registry)
	private readonly nullHandlerRegistry!: Handlers.Registry;

	public async types(request: Hapi.Request) {
		const activatedTransactionHandlers = await this.nullHandlerRegistry.getActivatedHandlers();
		const typeGroups: Record<string | number, Record<string, number>> = {};

		for (const handler of activatedTransactionHandlers) {
			const constructor = handler.getConstructor();

			const type: number | undefined = constructor.type;
			const typeGroup: number | undefined = constructor.typeGroup;
			const key: string | undefined = constructor.key;

			AppUtils.assert.defined<number>(type);
			AppUtils.assert.defined<number>(typeGroup);
			AppUtils.assert.defined<string>(key);

			if (typeGroups[typeGroup] === undefined) {
				typeGroups[typeGroup] = {};
			}

			typeGroups[typeGroup][key[0].toUpperCase() + key.slice(1)] = type;
		}

		return { data: typeGroups };
	}

	public async schemas(request: Hapi.Request) {
		const activatedTransactionHandlers = await this.nullHandlerRegistry.getActivatedHandlers();
		const schemasByType: Record<string, Record<string, any>> = {};

		for (const handler of activatedTransactionHandlers) {
			const constructor = handler.getConstructor();

			const type: number | undefined = constructor.type;
			const typeGroup: number | undefined = constructor.typeGroup;

			AppUtils.assert.defined<number>(type);
			AppUtils.assert.defined<number>(typeGroup);

			if (schemasByType[typeGroup] === undefined) {
				schemasByType[typeGroup] = {};
			}

			schemasByType[typeGroup][type] = constructor.getSchema().properties;
		}

		return { data: schemasByType };
	}
}
