import { pluralize as pluralizeUtils } from "../distribution/pluralize.js";
import pluralizeFull from "pluralize";

export const utils = () => pluralizeUtils("block");
export const pluralize = () => pluralizeFull("block");
