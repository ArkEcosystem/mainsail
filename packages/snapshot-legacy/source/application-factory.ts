import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { dirSync, setGracefulCleanup } from "tmp";

import { Identifiers as InternalIdentifiers } from "./identifiers.js";
import { Generator } from "./snapshot/generator.js";

export const makeApplication = async (configurationPath: string, options: Record<string, any> = {}) => {
	options = { name: "mainsail", ...options };

	const app = new Application(new Container());
	app.bind(Identifiers.Application.Name).toConstantValue(options.name);
	app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({});
	app.bind(Identifiers.Services.Log.Service).toConstantValue({});

	setGracefulCleanup();
	app.rebind("path.data").toConstantValue(dirSync().name);

	app.bind(InternalIdentifiers.Application).toConstantValue(app);

	//
	app.bind(InternalIdentifiers.Snapshot.Generator).to(Generator);

	return app;
};
