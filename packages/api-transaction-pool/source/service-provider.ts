import { AbstractServiceProvider, ServerConstructor } from "@mainsail/api-common";

import Handlers from "./handlers";
import { Identifiers as ApiTransactionPoolIdentifiers } from "./identifiers";
import { Server } from "./server";

export class ServiceProvider extends AbstractServiceProvider<Server> {
	protected httpIdentifier(): symbol {
		return ApiTransactionPoolIdentifiers.HTTP;
	}

	protected httpsIdentifier(): symbol {
		return ApiTransactionPoolIdentifiers.HTTPS;
	}

	protected getServerConstructor(): ServerConstructor<Server> {
		return Server;
	}

	protected getHandlers(): any | any[] {
		return Handlers;
	}
}
