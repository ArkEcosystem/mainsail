import { hasProperty } from "./has-property";
import { some } from "./some";

export const hasSomeProperty = <T>(object: T, properties: string[]): boolean =>
	some(properties, (property: string) => hasProperty(object, property));
