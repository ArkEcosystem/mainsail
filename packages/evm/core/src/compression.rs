use std::borrow::Cow;

const VERSION: u8 = 1;
const ZSTD_LEVEL: i32 = 3;

#[derive(Debug)]
pub(crate) struct CompressedBincode<T>(pub T);
impl<'a, T: serde::Serialize + 'a> heed::BytesEncode<'a> for CompressedBincode<T> {
    type EItem = CompressedBincode<&'a T>;

    fn bytes_encode(item: &'a Self::EItem) -> Result<Cow<'a, [u8]>, heed::BoxedError> {
        let raw = bincode::serialize(&item.0)?;
        let orig_len = raw.len();
        let compressed = zstd::bulk::compress(&raw, ZSTD_LEVEL)?;

        let mut out = Vec::with_capacity(1 + 4 + compressed.len());

        // [1 byte version][4 bytes orig_len LE][compressed...]
        out.push(VERSION);
        out.extend_from_slice(&(orig_len as u32).to_le_bytes());
        out.extend_from_slice(&compressed);

        Ok(Cow::Owned(out))
    }
}

impl<'a, T: serde::de::DeserializeOwned + 'a> heed::BytesDecode<'a> for CompressedBincode<T> {
    type DItem = CompressedBincode<T>;

    fn bytes_decode(bytes: &'_ [u8]) -> Result<Self::DItem, heed::BoxedError> {
        let version = bytes[0];
        assert_eq!(version, VERSION, "unsupported version");

        let mut len_bytes = [0u8; 4];
        len_bytes.copy_from_slice(&bytes[1..5]);
        let orig_len = u32::from_le_bytes(len_bytes) as usize;

        let payload = &bytes[5..];
        let decompressed = zstd::bulk::decompress(payload, orig_len)?;

        let deserialized = bincode::deserialize(&decompressed)?;

        Ok(CompressedBincode(deserialized))
    }
}
