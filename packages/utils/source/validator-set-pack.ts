export const validatorSetPack = (validatorSet: boolean[]): bigint => {
    let packed = 0n;
    for (const [index, element] of validatorSet.entries()) {
        if (element) {
            packed += 2n ** BigInt(index);
        }
    }

    return packed;
}

export const validatorSetUnpack = (packed: bigint, numberOfValidators: number): boolean[] => {
    const validatorSet: boolean[] = new Array(numberOfValidators);
    for (let index = 0; index < numberOfValidators; index++) {
        const mask = 2n ** BigInt(index);
        const isSet = (packed & mask) > 0;
        validatorSet[index] = isSet;
    }

    return validatorSet;
}
