import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { EvmInstance } from "@mainsail/evm-service/distribution/instances/index.js";

import { DatabaseService } from "../source/database-service";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { setGracefulCleanup } from "tmp";

describe<{
	app: Application;
	evm: Contracts.Evm.Instance;
	databaseService: Contracts.Database.DatabaseService;
}>("DatabaseService", ({ it, afterAll, afterEach, beforeEach, assert }) => {
	afterAll(() => setGracefulCleanup());

	afterEach(async (context) => {
		await context.evm.dispose();
	});

	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.app.bind(Identifiers.Evm.Instance).to(EvmInstance).inSingletonScope().whenTagged("instance", "evm");

		context.evm = context.app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");

		context.databaseService = context.app.resolve(DatabaseService);
		await context.databaseService.initialize();
	});

	it("ok", async ({app}) => {
		// const configuration = app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
		// const genesisBlockJson = configuration.get<Contracts.Crypto.CommitJson>("genesisBlock");

		// console.log(genesisBlockJson)
		console.log("Here")
	})
});
