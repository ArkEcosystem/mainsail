use alloy_primitives::Keccak256;
use revm::{
    primitives::{Address, B256, U256},
    state::{AccountInfo, Bytecode},
};
use std::collections::BTreeMap;

use crate::{
    db::{GenesisInfo, PendingCommit},
    legacy::{LegacyAccountAttributes, LegacyAddress, LegacyColdWallet},
    state_changes::StorageChangeset,
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
        .as_ref()
        .expect("state commit exists");
    let change_set = &state.change_set;

    let mut w = HashWriter::new();
    w.put(DOMAIN_STATE_ROOT);
    w.put_u64(state.key.0);
    w.put(parent_hash.as_slice());

    w.put_u8(TAG_GENESIS_INFO);
    put_genesis_info(&mut w, genesis_info);

    w.put_u8(TAG_ACCOUNTS);
    put_accounts(&mut w, &change_set.accounts);

    w.put_u8(TAG_CONTRACTS);
    put_contracts(&mut w, &change_set.contracts);

    w.put_u8(TAG_STORAGE);
    put_storage(&mut w, &change_set.storage);

    w.put_u8(TAG_LEGACY_ATTRIBUTES);
    put_attributes_map(&mut w, &change_set.legacy_attributes);

    w.put_u8(TAG_LEGACY_COLD_WALLETS);
    put_cold_wallets(&mut w, &change_set.legacy_cold_wallets);

    w.put_u8(TAG_MERGED_LEGACY_COLD_WALLETS);
    put_merged_cold_wallets(&mut w, &change_set.merged_legacy_cold_wallets);

    Ok(w.finalize())
}

fn put_genesis_info(w: &mut HashWriter, info: &GenesisInfo) {
    w.put(info.account.as_slice());
    w.put(info.deployer_account.as_slice());
    w.put(info.validator_contract.as_slice());
    w.put(info.username_contract.as_slice());
    w.put_u64(info.initial_block_number);
    w.put_u256(info.initial_supply);
}

fn put_accounts(w: &mut HashWriter, accounts: &[(Address, Option<AccountInfo>)]) {
    w.put_len(accounts.len());

    for (address, account) in accounts {
        w.put(address.as_slice());

        w.put_opt(account.as_ref(), |w, account| {
            w.put_u256(account.balance);
            w.put_u64(account.nonce);
            w.put(account.code_hash.as_slice());
        });
    }
}

fn put_contracts(w: &mut HashWriter, contracts: &[(B256, Bytecode)]) {
    w.put_len(contracts.len());

    for (code_hash, _) in contracts {
        w.put(code_hash.as_slice());
    }
}

fn put_storage(w: &mut HashWriter, storage: &[StorageChangeset]) {
    w.put_len(storage.len());

    for change in storage {
        w.put(change.address.as_slice());
        w.put_u8(change.wipe_storage.into());
        w.put_len(change.storage.len());

        for (slot, value) in &change.storage {
            w.put_u256(*slot);
            w.put_u256(value.previous_or_original_value);
            w.put_u256(value.present_value);
        }
    }
}

fn put_attributes(w: &mut HashWriter, attributes: &LegacyAccountAttributes) {
    w.put_opt(attributes.legacy_nonce, HashWriter::put_u64);
    w.put_opt(attributes.second_public_key.as_deref(), |w, key| {
        w.put_bytes(key.as_bytes())
    });
    w.put_opt(attributes.multi_signature.as_ref(), |w, multi_signature| {
        w.put_len(multi_signature.min);
        w.put_len(multi_signature.public_keys.len());
        for key in &multi_signature.public_keys {
            w.put_bytes(key.as_bytes());
        }
    });
}

fn put_attributes_map(w: &mut HashWriter, attributes: &BTreeMap<Address, LegacyAccountAttributes>) {
    w.put_len(attributes.len());

    for (address, attributes) in attributes {
        w.put(address.as_slice());
        put_attributes(w, attributes);
    }
}

fn put_cold_wallets(w: &mut HashWriter, wallets: &BTreeMap<LegacyAddress, LegacyColdWallet>) {
    w.put_len(wallets.len());

    for (address, wallet) in wallets {
        w.put(address.as_slice());
        w.put_u256(wallet.balance);
        put_attributes(w, &wallet.legacy_attributes);
        w.put_opt(
            wallet.merge_info.as_ref(),
            |w, (transaction_hash, address)| {
                w.put(transaction_hash.as_slice());
                w.put(address.as_slice());
            },
        );
    }
}

fn put_merged_cold_wallets(w: &mut HashWriter, merged: &BTreeMap<Address, (B256, LegacyAddress)>) {
    w.put_len(merged.len());

    for (address, (transaction_hash, legacy_address)) in merged {
        w.put(address.as_slice());
        w.put(transaction_hash.as_slice());
        w.put(legacy_address.as_slice());
    }
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

    #[inline]
    fn put(&mut self, bytes: &[u8]) {
        self.hasher.update(bytes);
    }

    #[inline]
    fn put_u8(&mut self, value: u8) {
        self.hasher.update([value]);
    }

    #[inline]
    fn put_u64(&mut self, value: u64) {
        self.hasher.update(value.to_be_bytes());
    }

    #[inline]
    fn put_u256(&mut self, value: U256) {
        self.hasher.update(value.to_be_bytes::<32>());
    }

    #[inline]
    fn put_len(&mut self, value: usize) {
        self.put_u64(value as u64);
    }

    #[inline]
    fn put_bytes(&mut self, bytes: &[u8]) {
        self.put_len(bytes.len());
        self.put(bytes);
    }

    #[inline]
    fn put_opt<T>(&mut self, value: Option<T>, put: impl FnOnce(&mut Self, T)) {
        match value {
            None => self.put_u8(0),
            Some(value) => {
                self.put_u8(1);
                put(self, value);
            }
        }
    }

    fn finalize(self) -> B256 {
        self.hasher.finalize()
    }
}

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
