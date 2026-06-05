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

#[derive(Debug)]
pub struct CompressedBincode<T>(pub T);
impl<'a, T: serde::Serialize + 'a> heed::BytesEncode<'a> for CompressedBincode<T> {
    type EItem = CompressedBincode<&'a T>;

    fn bytes_encode(item: &'a Self::EItem) -> Result<Cow<'a, [u8]>, heed::BoxedError> {
        let raw = bincode::serialize(&item.0)?;

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

impl<'a, T: serde::de::DeserializeOwned + 'a> heed::BytesDecode<'a> for CompressedBincode<T> {
    type DItem = CompressedBincode<T>;

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
                let decompressed = zstd::bulk::decompress(compressed, orig_len)?;
                bincode::deserialize(&decompressed)?
            }
            TAG_RAW => bincode::deserialize(payload)?,
            other => return Err(format!("CompressedBincode: unknown tag {other}").into()),
        };

        Ok(CompressedBincode(deserialized))
    }
}

impl<T> Deref for CompressedBincode<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
