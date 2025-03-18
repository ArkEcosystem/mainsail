import { camelCase } from "../distribution/camel-case.js";
import lodashCamelCase from "lodash/camelCase.js";

export const utils = () => camelCase("Foo Bar");
export const lodash = () => lodashCamelCase("Foo Bar");
