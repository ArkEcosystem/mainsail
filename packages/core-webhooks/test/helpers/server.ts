import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Application, Services } from "@arkecosystem/core-kernel";
import { dirSync, setGracefulCleanup } from "tmp";

import { Database } from "../../source/database";
import { InternalIdentifiers as WebhookIdentifiers } from "../../source/identifiers";
import { Server } from "../../source/server/server";

export type Context = {
	app: Application;
	server: Server;
};

const initApp = (context: Context) => {
	const logger = {
		debug: () => {},
		error: () => {},
		notice: () => {},
	};

	context.app = new Application(new Container());
	context.app.bind(Identifiers.EventDispatcherService).to(Services.Events.MemoryEventDispatcher).inSingletonScope();
	context.app.bind(Identifiers.LogService).toConstantValue(logger);
	context.app.bind("path.cache").toConstantValue(dirSync().name);
	context.app.bind<Database>(WebhookIdentifiers.Database).to(Database).inSingletonScope();
	context.app.get<Database>(WebhookIdentifiers.Database).boot();
	context.app.bind(WebhookIdentifiers.Server).to(Server).inSingletonScope();
};

const initServer = async (context: Context, serverOptions: any) => {
	context.server = context.app.get<Server>(WebhookIdentifiers.Server);

	await context.server.register(serverOptions);
	await context.server.boot();
};

const request = async (server: Server, method, path, payload = {}) => {
	const response = await server.inject({ method, payload, url: `http://localhost:4004/api/${path}` });

	return { body: response.result as any, status: response.statusCode };
};

const dispose = async (context: Context) => {
	await context.server.dispose();
};

const cleanup = () => {
	setGracefulCleanup();
};

export const ServerHelper = {
	cleanup,
	dispose,
	initApp,
	initServer,
	request,
};
