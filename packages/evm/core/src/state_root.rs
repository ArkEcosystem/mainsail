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
    use crate::{
        db::{GenesisInfo, PendingCommit},
        legacy::{
            LegacyAccountAttributes, LegacyAddress, LegacyColdWallet, LegacyMultiSignatureAttribute,
        },
        state_changes::{StateChangeset, StorageChangeset},
        state_commit::StateCommit,
        state_root::{HashWriter, calculate},
    };
    use alloy_primitives::{B256, U256, address, b256, keccak256};
    use revm::{
        database::states::StorageSlot,
        primitives::Bytes,
        state::{AccountInfo, Bytecode},
    };

    fn root_of(change_set: StateChangeset, parent_hash: B256) -> B256 {
        let mut pending_commit = PendingCommit {
            built_commit: Some(StateCommit {
                change_set,
                ..Default::default()
            }),
            ..Default::default()
        };

        calculate(&Default::default(), &mut pending_commit, parent_hash).expect("ok")
    }

    #[test]
    fn test_hash_writer_matches_keccak256() {
        let input = b"hello world";

        let mut writer = HashWriter::new();
        writer.put(input);

        assert_eq!(writer.finalize(), keccak256(input));
    }

    #[test]
    fn test_calculate_state_root_default() {
        assert_eq!(
            calculate(&Default::default(), &mut Default::default(), B256::ZERO).expect("ok"),
            b256!("0xcdb087797fbad2b262ac6e73c4547aad8d6222c179ed4b44e65ab84bd5799829")
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
            b256!("0xe393577bd112ed50c5256678dfa8706d28bd16ad0d63dd60770b397347251e1d")
        );
    }

    #[test]
    fn test_calculate_state_root_all_sections() {
        let contract = Bytecode::new_legacy(Bytes::from_static(&[0x60, 0x04, 0x56, 0x00, 0x5b]));
        let attributes = LegacyAccountAttributes {
            legacy_nonce: Some(5),
            second_public_key: Some("second".into()),
            multi_signature: Some(LegacyMultiSignatureAttribute {
                min: 2,
                public_keys: vec!["first".into(), "second".into()],
            }),
        };
        let legacy_address: LegacyAddress =
            "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt".try_into().unwrap();
        let merged_address = LegacyAddress::from([0xab; 21]);

        let mut change_set = StateChangeset {
            accounts: vec![
                (
                    address!("0000000000000000000000000000000000000001"),
                    Some(
                        AccountInfo {
                            balance: U256::from(1),
                            nonce: 7,
                            code_hash: contract.hash_slow(),
                            ..Default::default()
                        }
                        .without_code(),
                    ),
                ),
                // Selfdestructed.
                (address!("0000000000000000000000000000000000000002"), None),
            ],
            contracts: vec![(contract.hash_slow(), contract)],
            storage: vec![
                StorageChangeset {
                    address: address!("0000000000000000000000000000000000000003"),
                    wipe_storage: true,
                    storage: vec![(
                        U256::from(1),
                        StorageSlot::new_changed(U256::ZERO, U256::from(1234)),
                    )],
                },
                StorageChangeset {
                    address: address!("0000000000000000000000000000000000000004"),
                    wipe_storage: false,
                    storage: vec![
                        (
                            U256::from(1),
                            StorageSlot::new_changed(U256::from(11), U256::from(22)),
                        ),
                        (
                            U256::from(2),
                            StorageSlot::new_changed(U256::ZERO, U256::from(5678)),
                        ),
                    ],
                },
                // Wiped with no surviving slots.
                StorageChangeset {
                    address: address!("0000000000000000000000000000000000000005"),
                    wipe_storage: true,
                    storage: vec![],
                },
            ],
            ..Default::default()
        };

        change_set.legacy_attributes.insert(
            address!("0000000000000000000000000000000000000001"),
            attributes.clone(),
        );
        change_set.legacy_attributes.insert(
            address!("0000000000000000000000000000000000000002"),
            LegacyAccountAttributes::default(),
        );

        change_set.legacy_cold_wallets.insert(
            legacy_address,
            LegacyColdWallet {
                address: legacy_address,
                balance: U256::from(255),
                legacy_attributes: attributes,
                merge_info: None,
            },
        );
        change_set.legacy_cold_wallets.insert(
            merged_address,
            LegacyColdWallet {
                address: merged_address,
                balance: U256::from(256),
                legacy_attributes: LegacyAccountAttributes::default(),
                merge_info: Some((
                    b256!("0000000000000000000000000000000000000000000000000000000000000009"),
                    address!("0000000000000000000000000000000000000001"),
                )),
            },
        );

        change_set.merged_legacy_cold_wallets.insert(
            address!("0000000000000000000000000000000000000001"),
            (
                b256!("0000000000000000000000000000000000000000000000000000000000000001"),
                merged_address,
            ),
        );

        assert_eq!(
            root_of(change_set, B256::ZERO),
            b256!("0x21fd261030ce1ea564e4234394d2d6602fbb32e6c58d79ffc18fafd91f2767f8")
        );
    }

    #[test]
    fn contracts_commit_to_code_hash_only() {
        let code_hash = b256!("0000000000000000000000000000000000000000000000000000000000000007");

        let root_of_code = |code: Bytecode| {
            root_of(
                StateChangeset {
                    contracts: vec![(code_hash, code)],
                    ..Default::default()
                },
                B256::ZERO,
            )
        };

        assert_eq!(
            root_of_code(Bytecode::new_legacy(Bytes::from_static(&[
                0x60, 0x04, 0x56, 0x00, 0x5b
            ]))),
            root_of_code(Bytecode::new_eip7702(address!(
                "0000000000000000000000000000000000000009"
            ))),
            "the contracts section must depend only on the code hash"
        );
    }
}
