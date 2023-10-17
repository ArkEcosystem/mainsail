export const vendorFieldTransformer = {
    from: (value: Buffer | undefined | null): string | null => {
        if (value !== undefined && value !== null) {
            return value.toString("utf8");
        }

        return null;
    },
    to: (value: any): any => {
        return value;
    },
};
