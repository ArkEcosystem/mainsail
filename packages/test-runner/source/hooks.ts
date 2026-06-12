import kleur from "kleur";

import { ensureError } from "./ensure-error.js";

export const runHook =
	<T>(callback: (context: T) => Promise<void> | void) =>
	async (context: T): Promise<void> => {
		try {
			await callback(context);
		} catch (rawError) {
			const error = ensureError(rawError);
			console.error(kleur.bold(kleur.bgRed(kleur.white(error.stack ?? error.message))));
			throw error;
		}
	};
