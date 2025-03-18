import { pullAllBy } from "../distribution/pull-all-by.js";
import lodashPullAllBy from "lodash/pullAllBy.js";

export const utils = () =>
	pullAllBy(
		[
			{
				x: 1,
			},
			{
				x: 2,
			},
			{
				x: 3,
			},
			{
				x: 1,
			},
		],
		[
			{
				x: 1,
			},
			{
				x: 3,
			},
		],
		(o) => o.x,
	);

export const lodash = () =>
	lodashPullAllBy(
		[
			{
				x: 1,
			},
			{
				x: 2,
			},
			{
				x: 3,
			},
			{
				x: 1,
			},
		],
		[
			{
				x: 1,
			},
			{
				x: 3,
			},
		],
		(o) => o.x,
	);
