import { BootServiceProviders } from "./boot-service-providers.js";
import { LoadConfiguration } from "./load-configuration.js";
import { LoadEnvironmentVariables } from "./load-environment-variables.js";
import { LoadServiceProviders } from "./load-service-providers.js";
import { RegisterBaseBindings } from "./register-base-bindings.js";
import { RegisterBaseConfiguration } from "./register-base-configuration.js";
import { RegisterBasePaths } from "./register-base-paths.js";
import { RegisterBaseServiceProviders } from "./register-base-service-providers.js";
import { RegisterErrorHandler } from "./register-error-handler.js";
import { RegisterServiceProviders } from "./register-service-providers.js";

export { BootServiceProviders } from "./boot-service-providers.js";
export { LoadConfiguration } from "./load-configuration.js";
export { LoadEnvironmentVariables } from "./load-environment-variables.js";
export { LoadServiceProviders } from "./load-service-providers.js";
export { RegisterBaseBindings } from "./register-base-bindings.js";
export { RegisterBaseConfiguration } from "./register-base-configuration.js";
export { RegisterBasePaths } from "./register-base-paths.js";
export { RegisterBaseServiceProviders } from "./register-base-service-providers.js";
export { RegisterErrorHandler } from "./register-error-handler.js";
export { RegisterServiceProviders } from "./register-service-providers.js";

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
