import { interfaces } from "inversify";

export const anyAncestorOrTargetTaggedFirst =
	(key: string | number | symbol, value: any) => (request: interfaces.Request) => {
		for (;;) {
			const targetTags = request.target.getCustomTags();
			if (targetTags) {
				const targetTag = targetTags.find((t) => t.key === key);
				if (targetTag) {
					return targetTag.value === value;
				}
			}
			if (!request.parentRequest) {
				return false;
			}
			request = request.parentRequest;
		}
	};
