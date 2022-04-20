import { describeWithContext } from "../../core-test-framework";
import { lowerFirst } from "./lower-first";

describeWithContext(
	"lowerFirst",
	() => ({
		dummies: {
			FRED: "fRED",
			Fred: "fred",
			"Test Space": "test Space",
		},
	}),
	({ assert, it, nock, loader }) => {
		it("should uncapitalize the given input", (context) => {
			for (const key of Object.keys(context.dummies)) {
				assert.is(lowerFirst(key), context.dummies[key]);
			}
		});
	},
);
