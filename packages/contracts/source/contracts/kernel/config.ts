export interface ConfigLoader {
	loadEnvironmentVariables(): Promise<void>;

	loadConfiguration(): Promise<void>;
}
