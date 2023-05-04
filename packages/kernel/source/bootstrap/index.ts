/* eslint-disable simple-import-sort/imports */
import { RegisterBaseServiceProviders } from "./register-base-service-providers";
import { RegisterErrorHandler } from "./register-error-handler";
import { RegisterBaseConfiguration } from "./register-base-configuration";
import { RegisterBaseBindings } from "./register-base-bindings";
import { RegisterBaseNamespace } from "./register-base-namespace";
import { RegisterBasePaths } from "./register-base-paths";
import { LoadEnvironmentVariables } from "./load-environment-variables";
import { LoadConfiguration } from "./load-configuration";
import { LoadServiceProviders } from "./load-service-providers";

import { RegisterServiceProviders } from "./register-service-providers";
import { BootServiceProviders } from "./boot-service-providers";

export const Bootstrappers = {
	app: [
		RegisterBaseServiceProviders,
		RegisterErrorHandler,
		RegisterBaseConfiguration,
		RegisterBaseBindings,
		RegisterBaseNamespace,
		RegisterBasePaths,
		LoadEnvironmentVariables,
		LoadConfiguration,
		LoadServiceProviders,
	],
	serviceProviders: [RegisterServiceProviders, BootServiceProviders],
};
