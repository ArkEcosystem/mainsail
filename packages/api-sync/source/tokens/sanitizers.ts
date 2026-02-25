const MAX_COMMENT_LEN = 256;

// Strict ISO-8601 UTC with milliseconds: 2026-02-11T14:25:00.000Z
const PG_TIMESTAMPTZ_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const isValidPgTimestamptz = (timestamp: string): boolean => {
    if (!PG_TIMESTAMPTZ_RE.test(timestamp)) {
        return false;
    }

    const parsed = Date.parse(timestamp);
    return Number.isFinite(parsed) && new Date(parsed).toISOString() === timestamp;
};

export const sanitizeComment = (comment: string): string | undefined => {
    if (comment === null) {
        return;
    }

    if (typeof comment !== 'string') {
        return;
    }

    const trimmed = comment.trim();
    if (trimmed.length === 0) {
        return;
    }

    const clipped = [...trimmed].slice(0, MAX_COMMENT_LEN).join('');
    return clipped;
};
