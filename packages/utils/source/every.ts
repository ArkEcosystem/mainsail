import { FunctionReturning } from "./internal";

export const every = <T>(subject: T[], iterator: FunctionReturning): boolean => {
	for (let index = 0; index < subject.length; index++) {
		if (!iterator(subject[index], index, subject)) {
			return false;
		}
	}

	return true;
};
