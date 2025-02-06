use bs58;
use revm::primitives::{alloy_primitives::wrap_fixed_bytes, Address, B256, U256};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct LegacyColdWallet {
    pub address: LegacyAddress,
    pub balance: U256,
    pub legacy_attributes: LegacyAccountAttributes,
    pub merge_info: Option<(B256, Address)>,
}

#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct LegacyAccountAttributes {
    pub second_public_key: Option<String>,
    pub multi_signature: Option<LegacyMultiSignatureAttribute>,
}

impl LegacyAccountAttributes {
    pub fn is_empty(&self) -> bool {
        self.second_public_key.is_none() && self.multi_signature.is_none()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct LegacyMultiSignatureAttribute {
    pub min: usize,
    pub public_keys: Vec<String>,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum LegacyAddressError {
    InvalidSize,
    InvalidBase58,
    InvalidChecksum,
    InvalidBytes,
}

wrap_fixed_bytes!(
    extra_derives: [],
    // A legacy 21-byte ARK address
    pub struct LegacyAddress<21>;
);

impl std::fmt::Display for LegacyAddress {
    #[inline]
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let checksum = encode_base58check(&self[..]);
        f.write_str(&checksum)
    }
}

impl TryFrom<&str> for LegacyAddress {
    type Error = LegacyAddressError;

    #[inline]
    fn try_from(value: &str) -> Result<Self, Self::Error> {
        let decoded = decode_base58check(value)?;
        Self::try_from(&decoded[..]).map_err(|_| LegacyAddressError::InvalidBytes)
    }
}

#[inline]
fn decode_base58check(encoded: &str) -> Result<Vec<u8>, LegacyAddressError> {
    let decoded = bs58::decode(encoded)
        .into_vec()
        .map_err(|e| e.to_string())
        .map_err(|_| LegacyAddressError::InvalidBase58)?;

    if decoded.len() < 4 {
        return Err(LegacyAddressError::InvalidSize);
    }

    let (data, checksum) = decoded.split_at(decoded.len() - 4);
    let computed_checksum = Sha256::digest(&Sha256::digest(data));
    if &computed_checksum[..4] != checksum {
        return Err(LegacyAddressError::InvalidChecksum);
    }

    Ok(data.to_vec())
}

#[inline]
fn encode_base58check(data: &[u8]) -> String {
    let checksum = Sha256::digest(&Sha256::digest(data));
    let mut extended_data = data.to_vec();
    extended_data.extend_from_slice(&checksum[..4]);

    bs58::encode(extended_data).into_string()
}

#[cfg(test)]
mod testsc {
    use crate::legacy::{
        decode_base58check, encode_base58check, LegacyAddress, LegacyAddressError,
    };

    #[test]
    fn test_encode() {
        let address = "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt";

        let decoded: [u8; 21] = [
            30, 149, 144, 208, 106, 80, 8, 63, 148, 59, 207, 233, 127, 161, 7, 27, 208, 185, 40,
            87, 19,
        ];

        let actual = encode_base58check(&decoded);
        assert_eq!(actual, address);
    }

    #[test]
    fn test_decode() {
        let address = "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt";

        let decoded: [u8; 21] = [
            30, 149, 144, 208, 106, 80, 8, 63, 148, 59, 207, 233, 127, 161, 7, 27, 208, 185, 40,
            87, 19,
        ];

        let actual = decode_base58check(address).expect("ok");
        assert_eq!(actual, decoded);
    }

    #[test]
    fn test_from_str() {
        let address: LegacyAddress = "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt".try_into().expect("ok");

        let decoded: [u8; 21] = [
            30, 149, 144, 208, 106, 80, 8, 63, 148, 59, 207, 233, 127, 161, 7, 27, 208, 185, 40,
            87, 19,
        ];

        assert_eq!(&address[..], decoded);
    }

    #[test]
    fn test_decode_failure() {
        let address = "_!@@@";
        let err = decode_base58check(address).expect_err("must err");
        assert_eq!(err, LegacyAddressError::InvalidBase58);

        let address = "DJm";
        let err = decode_base58check(address).expect_err("must err");
        assert_eq!(err, LegacyAddressError::InvalidSize);

        let address = "DjmvhhiqfSrEQCq9FUxvcLcpcBjx7K3yLt";
        let err = decode_base58check(address).expect_err("must err");
        assert_eq!(err, LegacyAddressError::InvalidChecksum);
    }
}
