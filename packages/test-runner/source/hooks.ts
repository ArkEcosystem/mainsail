import type { Context } from "uvu";

import kleur from "kleur";

import { ensureError } from "./ensure-error.js";

export const runHook =
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	(callback: Function) =>
		async (context: Context): Promise<void> => {
			try {
				await callback(context);
			} catch (rawError) {
				const error = ensureError(rawError);
				console.log(kleur.bold(kleur.bgRed(kleur.white(error.stack ?? error.message))));
				throw error;
			}
		};
