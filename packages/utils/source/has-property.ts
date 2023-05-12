export const hasProperty = <T>(object: T, property: string): boolean =>
	Object.prototype.hasOwnProperty.call(object, property);
