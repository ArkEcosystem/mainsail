import { extname } from "path";

export const extension = (path: string): string | undefined => extname(path).slice(1) || undefined;
