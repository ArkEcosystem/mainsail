import { parse } from "envfile";
import { existsSync, readFileSync } from "fs";

export const loadEnvironmentFile = (
	app: { getCorePath(type: string, file: string): string },
	components: { fatal(message: string): void },
): object => {
	const environmentFile: string = app.getCorePath("config", ".env");

	if (!existsSync(environmentFile)) {
		components.fatal(`No environment file found at ${environmentFile}.`);
	}

	return parse(readFileSync(environmentFile).toString("utf8"));
};
