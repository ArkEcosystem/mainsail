/* eslint-disable simple-import-sort/imports */
import { RegisterBaseServiceProviders } from "./register-base-service-providers.js";
import { RegisterErrorHandler } from "./register-error-handler.js";
import { RegisterBaseConfiguration } from "./register-base-configuration.js";
import { RegisterBaseBindings } from "./register-base-bindings.js";
import { RegisterBasePaths } from "./register-base-paths.js";
import { LoadEnvironmentVariables } from "./load-environment-variables.js";
import { LoadConfiguration } from "./load-configuration.js";
import { LoadServiceProviders } from "./load-service-providers.js";

import { RegisterServiceProviders } from "./register-service-providers.js";
import { BootServiceProviders } from "./boot-service-providers.js";

export const Bootstrappers = {
	app: [
		RegisterBaseServiceProviders,
		RegisterErrorHandler,
		RegisterBaseConfiguration,
		RegisterBaseBindings,
		RegisterBasePaths,
		LoadEnvironmentVariables,
		LoadConfiguration,
		LoadServiceProviders,
	],
	serviceProviders: [RegisterServiceProviders, BootServiceProviders],
};
