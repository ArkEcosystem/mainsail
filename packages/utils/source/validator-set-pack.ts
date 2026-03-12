export const validatorSetPack = (validatorSet: boolean[]): bigint => {
	let packed = 0n;
	for (const [index, element] of validatorSet.entries()) {
		if (element) {
			packed += 2n ** BigInt(index);
		}
	}

	return packed;
};

export const validatorSetUnpack = (packed: bigint, numberOfValidators: number): boolean[] => {
	if (!Number.isInteger(numberOfValidators) || numberOfValidators < 0) {
		throw new RangeError("`numberOfValidators` must be a non-negative integer");
	}

	if (packed < 0n) {
		throw new RangeError("`packed` must be non-negative");
	}

	if (packed >> BigInt(numberOfValidators) !== 0n) {
		throw new RangeError("`packed` contains set bits beyond `numberOfValidators`");
	}

	const validatorSet: boolean[] = Array.from({ length: numberOfValidators });

	let mask = 1n;
	for (let index = 0; index < numberOfValidators; index++) {
		const isSet = (packed & mask) !== 0n;
		validatorSet[index] = isSet;

		mask <<= 1n;
	}

	return validatorSet;
};
