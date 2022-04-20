import { describeWithContext } from "../../core-test-framework";
import { upperFirst } from "./upper-first";

describeWithContext(
	"upperFirst",
	() => ({
		dummies: {
			FRED: "FRED",
			fred: "Fred",
			"test space": "Test space",
		},
	}),
	({ assert, it, nock, loader }) => {
		it("should capitalize the given input", (context) => {
			for (const key of Object.keys(context.dummies)) {
				assert.is(upperFirst(key), context.dummies[key]);
			}
		});
	},
);
