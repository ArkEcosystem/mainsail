import kleur from "kleur";
import { Context } from "uvu";

export const runHook =
    (callback: Function) =>
    async (context: Context): Promise<void> => {
        try {
            await callback(context);
        } catch (error) {
            console.log(kleur.bold(kleur.bgRed(kleur.white(error.stack))));
        }
    };
