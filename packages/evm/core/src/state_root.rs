use alloy_primitives::Keccak256;
use revm::primitives::B256;
use serde::Serialize;
use std::io::{self, Write};

use crate::{
    db::{GenesisInfo, PendingCommit},
    state_commit::build_commit,
};

const DOMAIN_STATE_ROOT: &[u8] = b"MAINSAIL_STATE_v1";

const TAG_GENESIS_INFO: u8 = 0xff;
const TAG_ACCOUNTS: u8 = 0x01;
const TAG_CONTRACTS: u8 = 0x02;
const TAG_STORAGE: u8 = 0x03;
const TAG_LEGACY_ATTRIBUTES: u8 = 0x04;
const TAG_LEGACY_COLD_WALLETS: u8 = 0x05;
const TAG_MERGED_LEGACY_COLD_WALLETS: u8 = 0x06;

pub fn calculate(
    genesis_info: &GenesisInfo,
    pending_commit: &mut PendingCommit,
    parent_hash: B256,
) -> Result<B256, crate::db::Error> {
    if pending_commit.built_commit.is_none() {
        let state_commit = build_commit(pending_commit)?;
        pending_commit.built_commit.replace(state_commit);
    };

    let state = pending_commit
        .built_commit
        .as_mut()
        .expect("state commit exists");

    let mut w = HashWriter::new();

    w.write(DOMAIN_STATE_ROOT)?;
    w.write(&state.key.0.to_le_bytes())?;
    w.write(parent_hash.as_slice())?;
    encode_section(&mut w, TAG_GENESIS_INFO, genesis_info)?;

    encode_section(&mut w, TAG_ACCOUNTS, &state.change_set.accounts)?;
    encode_section(&mut w, TAG_CONTRACTS, &state.change_set.contracts)?;
    encode_section(&mut w, TAG_STORAGE, &state.change_set.storage)?;
    encode_section(
        &mut w,
        TAG_LEGACY_ATTRIBUTES,
        &state.change_set.legacy_attributes,
    )?;
    encode_section(
        &mut w,
        TAG_LEGACY_COLD_WALLETS,
        &state.change_set.legacy_cold_wallets,
    )?;
    encode_section(
        &mut w,
        TAG_MERGED_LEGACY_COLD_WALLETS,
        &state.change_set.merged_legacy_cold_wallets,
    )?;

    Ok(w.finalize())
}

fn encode_section<T: Serialize>(
    w: &mut HashWriter,
    tag: u8,
    value: &T,
) -> Result<(), crate::db::Error> {
    w.write(&[tag])?;
    bincode::serialize_into(w, value)?;
    Ok(())
}

struct HashWriter {
    hasher: Keccak256,
}

impl HashWriter {
    fn new() -> Self {
        Self {
            hasher: Keccak256::new(),
        }
    }

    fn finalize(self) -> B256 {
        self.hasher.finalize()
    }
}

impl Write for HashWriter {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        self.hasher.update(buf);
        Ok(buf.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

// fn dump_to_json(
//     state: &mut StateCommit,
//     path: impl AsRef<std::path::Path>,
// ) -> Result<(), crate::db::Error> {
//     let cs = &state.change_set;

//     let file = std::fs::File::create(path)
//         .map_err(|e| crate::db::Error::State(format!("dump_to_json open: {e}")))?;

//     serde_json::to_writer_pretty(file, cs)
//         .map_err(|e| crate::db::Error::State(format!("dump_to_json write: {e}")))?;

//     Ok(())
// }

#[cfg(test)]
mod tests {
    use std::io::Write;

    use crate::{
        db::{GenesisInfo, PendingCommit},
        state_changes::StateChangeset,
        state_commit::StateCommit,
        state_root::{HashWriter, calculate},
    };
    use alloy_primitives::{B256, U256, address, b256, keccak256};

    #[test]
    fn test_calculate_state_root_default() {
        let result =
            calculate(&Default::default(), &mut Default::default(), B256::ZERO).expect("ok");
        assert_eq!(
            result,
            revm::primitives::b256!(
                "0xed972bd9220a2354683cd776010d5a64de3e68d8eeced8f5987e303ff8768f70"
            )
        );
    }

    #[test]
    fn test_calculate_state_root_storage() {
        use crate::{
            legacy::{LegacyAccountAttributes, LegacyAddress},
            state_changes::StorageChangeset,
        };
        use alloy_primitives::{U256, address, b256};
        use revm::{database::states::StorageSlot, state::AccountInfo};

        let mut change_set = StateChangeset::default();
        change_set.accounts.push((
            address!("0000000000000000000000000000000000000001"),
            Some(AccountInfo::from_balance(U256::from(1))),
        ));

        let storage = vec![
            (
                U256::from(1),
                StorageSlot::new_changed(U256::ZERO, U256::from(1234)),
            ),
            (
                U256::from(2),
                StorageSlot::new_changed(U256::ZERO, U256::from(5678)),
            ),
        ];

        change_set.storage.push(StorageChangeset {
            address: address!("0000000000000000000000000000000000000002"),
            storage: storage.clone(),
            ..Default::default()
        });

        change_set.storage.push(StorageChangeset {
            address: address!("0000000000000000000000000000000000000003"),
            storage,
            ..Default::default()
        });

        change_set.legacy_attributes.insert(
            address!("0000000000000000000000000000000000000001"),
            LegacyAccountAttributes {
                legacy_nonce: Some(5),
                second_public_key: Some("".into()),
                ..Default::default()
            },
        );

        let legacy_address: LegacyAddress =
            "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt".try_into().unwrap();
        change_set.legacy_cold_wallets.insert(
            legacy_address.clone(),
            crate::legacy::LegacyColdWallet {
                address: legacy_address.clone(),
                balance: U256::from(255),
                legacy_attributes: LegacyAccountAttributes {
                    legacy_nonce: Some(3),
                    ..Default::default()
                },
                ..Default::default()
            },
        );

        change_set.merged_legacy_cold_wallets.insert(
            address!("0000000000000000000000000000000000000001"),
            (
                b256!("0000000000000000000000000000000000000000000000000000000000000001"),
                legacy_address,
            ),
        );

        let state = StateCommit {
            change_set,
            ..Default::default()
        };

        let mut pending_commit = PendingCommit {
            built_commit: Some(state),
            ..Default::default()
        };

        let result = calculate(&Default::default(), &mut pending_commit, B256::ZERO).expect("ok");
        assert_eq!(
            result,
            revm::primitives::b256!(
                "0x399fcde47d74f5131db840dbce5c86a13778f6fe1f3b64b203a7798ef67d3c1b"
            )
        );
    }

    #[test]
    fn test_calculate_state_root_committed() {
        let result = calculate(
            &GenesisInfo {
                account: address!("0000000000000000000000000000000000000001"),
                deployer_account: address!("0000000000000000000000000000000000000002"),
                validator_contract: address!("0000000000000000000000000000000000000003"),
                username_contract: address!("0000000000000000000000000000000000000004"),
                initial_block_number: 0,
                initial_supply: U256::from(1_000_000),
            },
            &mut Default::default(),
            b256!("0000000000000000000000000000000000000000000000000000000000000001"),
        )
        .expect("ok");
        assert_eq!(
            result,
            b256!("0x1e617f45632734dfa1d1e76d7f768d8f22337e097e3b4195e59a42bc449751f1")
        );
    }

    #[test]
    fn test_hash_writer_matches_keccak256_and_flush_is_ok() {
        let input = b"hello world";

        let mut writer = HashWriter::new();
        let written = writer.write(input).unwrap();
        assert_eq!(written, input.len());

        writer.flush().unwrap();

        let actual = writer.finalize();
        let expected = keccak256(input);

        assert_eq!(actual, expected);
    }
}
