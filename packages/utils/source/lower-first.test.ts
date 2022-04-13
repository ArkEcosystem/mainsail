import { describeWithContext } from "../../core-test-framework";

import { lowerFirst } from "./lower-first";

describeWithContext(
	"lowerFirst",
	() => ({
		dummies: {
			Fred: "fred",
			FRED: "fRED",
			"Test Space": "test Space",
		},
	}),
	({ assert, it, nock, loader }) => {
		it("should uncapitalize the given input", (context) => {
			Object.keys(context.dummies).forEach((key) => {
				assert.is(lowerFirst(key), context.dummies[key]);
			});
		});
	},
);
