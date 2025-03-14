import kleur from "kleur";
import { Context } from "uvu";

export const runHook =
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	(callback: Function) =>
		async (context: Context): Promise<void> => {
			try {
				await callback(context);
			} catch (error) {
				console.log(kleur.bold(kleur.bgRed(kleur.white(error.stack))));
				throw error;
			}
		};
