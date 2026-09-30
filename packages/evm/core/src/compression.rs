use std::{borrow::Cow, ops::Deref};

// First byte of every stored value tags how the remainder is encoded:
//   TAG_RAW:  [0][raw bincode]                      (uncompressed)
//   TAG_ZSTD: [1][orig_len: u32 LE][zstd payload]   (compressed)
const TAG_RAW: u8 = 0;
const TAG_ZSTD: u8 = 1;

const ZSTD_LEVEL: i32 = 3;

// Compression is only attempted for serialized values at least this large. The frequently-written
// values are poor candidates for two independent reasons:
//   - small size (accounts ~70 B, proofs ~120 B): too little context, and zstd's frame overhead
//     plus the 4-byte length header outweigh any gain;
//   - high-entropy content: keccak code hashes and BLS signatures are effectively random, so there
//     is no redundancy to exploit at any size.
// The threshold skips the first case cheaply; the "keep raw unless actually smaller" check on the
// result handles the second. Larger structured values (headers with a sparse logs bloom,
// ABI-padded calldata, receipt logs, bytecode) still compress and are kept only when it shrinks them.
const MIN_COMPRESS_LEN: usize = 256;

// Ceiling for the decode-side allocation implied by a stored `orig_len` header. Every
// persisted value is bounded far below this by protocol limits (block payload, receipts,
// bytecode); a header claiming more can only come from corruption, and honoring it would
// attempt a multi-GiB allocation (aborting on failure) before zstd even looks at the data.
const MAX_DECOMPRESSED_LEN: usize = 256 * 1024 * 1024;

#[derive(Debug)]
pub struct CompactBincode<T>(pub T);
impl<'a, T: serde::Serialize + 'a> heed::BytesEncode<'a> for CompactBincode<T> {
    type EItem = CompactBincode<&'a T>;

    fn bytes_encode(item: &'a Self::EItem) -> Result<Cow<'a, [u8]>, heed::BoxedError> {
        let raw = bincode::serialize(&item.0)?;

        // The compressed layout stores the original length as u32; a larger value would
        // silently wrap the header and become unreadable. (Unreachable under protocol
        // limits, but fail loudly at write time rather than at some later read.)
        if u32::try_from(raw.len()).is_err() {
            return Err(format!("CompressedBincode: value too large ({} bytes)", raw.len()).into());
        }

        if raw.len() >= MIN_COMPRESS_LEN {
            let compressed = zstd::bulk::compress(&raw, ZSTD_LEVEL)?;

            // The compressed layout carries an extra 4-byte original-length header; only keep it
            // when the result is genuinely smaller than storing raw (both forms share the 1-byte
            // tag, so it cancels out of the comparison).
            if compressed.len() + 4 < raw.len() {
                let mut out = Vec::with_capacity(1 + 4 + compressed.len());
                out.push(TAG_ZSTD);
                out.extend_from_slice(&(raw.len() as u32).to_le_bytes());
                out.extend_from_slice(&compressed);
                return Ok(Cow::Owned(out));
            }
        }

        // Store raw. A value is therefore never persisted larger than its bincode encoding plus the
        // single tag byte.
        let mut out = Vec::with_capacity(1 + raw.len());
        out.push(TAG_RAW);
        out.extend_from_slice(&raw);
        Ok(Cow::Owned(out))
    }
}

impl<'a, T: serde::de::DeserializeOwned + 'a> heed::BytesDecode<'a> for CompactBincode<T> {
    type DItem = CompactBincode<T>;

    fn bytes_decode(bytes: &'_ [u8]) -> Result<Self::DItem, heed::BoxedError> {
        let (&tag, payload) = bytes
            .split_first()
            .ok_or("CompressedBincode: empty value")?;

        let deserialized = match tag {
            TAG_ZSTD => {
                if payload.len() < 4 {
                    return Err("CompressedBincode: truncated zstd header".into());
                }
                let (len_bytes, compressed) = payload.split_at(4);
                let orig_len = u32::from_le_bytes(len_bytes.try_into().unwrap()) as usize;
                if orig_len > MAX_DECOMPRESSED_LEN {
                    return Err(format!(
                        "CompressedBincode: implausible original length {orig_len}"
                    )
                    .into());
                }
                let decompressed = zstd::bulk::decompress(compressed, orig_len)?;
                bincode::deserialize(&decompressed)?
            }
            TAG_RAW => bincode::deserialize(payload)?,
            other => return Err(format!("CompressedBincode: unknown tag {other}").into()),
        };

        Ok(CompactBincode(deserialized))
    }
}

impl<T> Deref for CompactBincode<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use heed::{BytesDecode, BytesEncode};

    use super::*;

    fn encode(value: &Vec<u8>) -> Vec<u8> {
        let item = CompactBincode(value);
        <CompactBincode<Vec<u8>> as BytesEncode>::bytes_encode(&item)
            .unwrap()
            .into_owned()
    }

    fn decode(bytes: &[u8]) -> Vec<u8> {
        <CompactBincode<Vec<u8>> as BytesDecode>::bytes_decode(bytes)
            .unwrap()
            .0
    }

    #[test]
    fn decode_rejects_implausible_length_header() {
        let mut value = vec![TAG_ZSTD];
        value.extend_from_slice(&u32::MAX.to_le_bytes());
        value.extend_from_slice(&[0xde, 0xad]);
        assert!(<CompactBincode<Vec<u8>> as BytesDecode>::bytes_decode(&value).is_err());
    }

    #[test]
    fn small_value_is_stored_raw() {
        let value = vec![1u8, 2, 3, 4, 5];
        let encoded = encode(&value);
        assert_eq!(encoded[0], TAG_RAW);
        assert_eq!(decode(&encoded), value);
    }

    #[test]
    fn large_compressible_value_is_stored_zstd_and_smaller() {
        let value = vec![7u8; 4096];
        let encoded = encode(&value);
        assert_eq!(encoded[0], TAG_ZSTD);
        assert!(encoded.len() < value.len());
        assert_eq!(decode(&encoded), value);
    }

    #[test]
    fn output_never_exceeds_raw_plus_tag() {
        // A large, hard-to-compress value: compression is attempted but must fall back to raw
        // rather than store something bigger.
        let value: Vec<u8> = (0..2048u32)
            .map(|i| (i.wrapping_mul(2_654_435_761) >> 13) as u8)
            .collect();
        let raw_len = bincode::serialize(&value).unwrap().len();

        let encoded = encode(&value);
        assert!(
            encoded.len() <= raw_len + 1,
            "encoded {} raw {}",
            encoded.len(),
            raw_len
        );
        assert_eq!(decode(&encoded), value);
    }

    #[test]
    fn empty_input_is_an_error_not_a_panic() {
        assert!(<CompactBincode<Vec<u8>> as BytesDecode>::bytes_decode(&[]).is_err());
    }

    #[test]
    fn truncated_zstd_header_is_an_error_not_a_panic() {
        // TAG_ZSTD with fewer than the four orig_len header bytes must error, not panic on the slice.
        assert!(<CompactBincode<Vec<u8>> as BytesDecode>::bytes_decode(&[TAG_ZSTD, 1, 2]).is_err());
    }

    #[test]
    fn unknown_tag_is_an_error_not_a_panic() {
        assert!(<CompactBincode<Vec<u8>> as BytesDecode>::bytes_decode(&[9, 0, 0]).is_err());
    }
}
