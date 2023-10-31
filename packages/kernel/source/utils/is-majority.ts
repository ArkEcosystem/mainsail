export const isMajority = (size: number, activeValidators: number): boolean => size >= (activeValidators / 3) * 2 + 1;
