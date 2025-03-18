import { snakeCase } from "../distribution/snake-case.js";
import lodashSnakeCase from "lodash/snakeCase.js";

export const utils = () => snakeCase("Foo Bar");
export const lodash = () => lodashSnakeCase("Foo Bar");
