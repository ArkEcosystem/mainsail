use std::collections::BTreeMap;

use heed::{RoTxn, RwTxn};
use revm::{
    primitives::{Address, B256, U256},
    state::AccountInfo,
};

use crate::db::Error;

#[derive(Clone, Debug, Default, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct HistoricalAccountData {
    pub balance: U256,
    pub nonce: u64,
    pub code_hash: B256,
}

impl From<AccountInfo> for HistoricalAccountData {
    fn from(value: AccountInfo) -> Self {
        HistoricalAccountData {
            balance: value.balance,
            nonce: value.nonce,
            code_hash: value.code_hash,
        }
    }
}

pub struct AccountHistory {
    capacity: u64,
}

impl AccountHistory {
    pub fn new(capacity: u64) -> Self {
        Self { capacity }
    }

    pub fn insert(
        &self,
        txn: &mut RwTxn,
        database: &heed::Database<
            heed::types::U64<heed::byteorder::BigEndian>,
            heed::types::SerdeBincode<BTreeMap<Address, HistoricalAccountData>>,
        >,
        block_number: u64,
        accounts: Vec<(Address, AccountInfo)>,
    ) -> Result<(), Error> {
        assert!(database.get(txn, &block_number)?.is_none());

        let count = database.len(txn)?;
        if count >= self.capacity {
            // delete oldest entries
            let range = ..=block_number.saturating_sub(self.capacity);
            database.delete_range(txn, &range)?;
        }

        let data = accounts
            .into_iter()
            .map(|a| (a.0, HistoricalAccountData::from(a.1)))
            .collect();

        database.put(txn, &block_number, &data)?;

        Ok(())
    }

    pub fn get_by_block_and_address(
        &self,
        txn: &RoTxn,
        database: &heed::Database<
            heed::types::U64<heed::byteorder::BigEndian>,
            heed::types::SerdeBincode<BTreeMap<Address, HistoricalAccountData>>,
        >,
        block_number: u64,
        address: &Address,
    ) -> Result<Option<HistoricalAccountData>, Error> {
        let mut iter = database.rev_range(txn, &..=block_number)?;

        while let Some((_, history)) = iter.next().transpose()? {
            if let Some(data) = history.get(address) {
                return Ok(Some(data.clone()));
            }
        }

        Ok(None)
    }
}

#[test]
fn test_account_history() {
    let path = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    let db = crate::db::PersistentDB::new(
        crate::db::PersistentDBOptions::new(path.path().to_path_buf()).with_history_size(10),
    )
    .expect("database");

    let history = AccountHistory::new(10);
    let mut txn = db.env.write_txn().unwrap();

    let history_db = &db.inner.borrow().accounts_history.unwrap();

    // Block 1
    history
        .insert(
            &mut txn,
            history_db,
            1,
            vec![
                (
                    revm::primitives::address!("0000000000000000000000000000000000000001"),
                    AccountInfo {
                        balance: U256::from(1),
                        nonce: 1,
                        ..Default::default()
                    },
                ),
                (
                    revm::primitives::address!("0000000000000000000000000000000000000002"),
                    AccountInfo {
                        balance: U256::from(2),
                        nonce: 1,
                        ..Default::default()
                    },
                ),
            ],
        )
        .unwrap();

    // Block 2
    history
        .insert(
            &mut txn,
            history_db,
            2,
            vec![
                (
                    revm::primitives::address!("0000000000000000000000000000000000000001"),
                    AccountInfo {
                        balance: U256::from(2),
                        nonce: 1,
                        ..Default::default()
                    },
                ),
                (
                    revm::primitives::address!("0000000000000000000000000000000000000003"),
                    AccountInfo {
                        balance: U256::from(3),
                        nonce: 3,
                        ..Default::default()
                    },
                ),
            ],
        )
        .unwrap();

    // Block 3 - 4 (empty)
    history.insert(&mut txn, history_db, 3, vec![]).unwrap();
    history.insert(&mut txn, history_db, 4, vec![]).unwrap();

    // Block 5
    history
        .insert(
            &mut txn,
            history_db,
            5,
            vec![
                (
                    revm::primitives::address!("0000000000000000000000000000000000000001"),
                    AccountInfo {
                        balance: U256::from(5),
                        nonce: 5,
                        ..Default::default()
                    },
                ),
                (
                    revm::primitives::address!("0000000000000000000000000000000000000004"),
                    AccountInfo {
                        balance: U256::from(4),
                        nonce: 4,
                        ..Default::default()
                    },
                ),
            ],
        )
        .unwrap();

    // Assert Account 1 at respective blocks (1 - 5)
    for (block_number, address, balance, nonce) in vec![
        // Block 1
        (
            1,
            revm::primitives::address!("0000000000000000000000000000000000000001"),
            U256::from(1),
            1,
        ),
        // Block 2
        (
            2,
            revm::primitives::address!("0000000000000000000000000000000000000001"),
            U256::from(2),
            1,
        ),
        // Block 3 (unchanged since block_number 2)
        (
            3,
            revm::primitives::address!("0000000000000000000000000000000000000001"),
            U256::from(2),
            1,
        ),
        // Block 4 (unchanged since block_number 2)
        (
            4,
            revm::primitives::address!("0000000000000000000000000000000000000001"),
            U256::from(2),
            1,
        ),
        // Block 5
        (
            5,
            revm::primitives::address!("0000000000000000000000000000000000000001"),
            U256::from(5),
            5,
        ),
    ] {
        let account = history
            .get_by_block_and_address(&mut txn, history_db, block_number, &address)
            .unwrap();

        assert!(account.is_some_and(|a| a
            == HistoricalAccountData {
                balance: balance,
                nonce: nonce,
                code_hash: revm::primitives::KECCAK_EMPTY,
            }));
    }

    // Assert Account 2 at respective block_numbers (1 - 5)
    for (block_number, address, balance, nonce) in vec![
        // Block 1
        (
            1,
            revm::primitives::address!("0000000000000000000000000000000000000002"),
            U256::from(2),
            1,
        ),
        // Block 2 (unchanged since block_number 1)
        (
            2,
            revm::primitives::address!("0000000000000000000000000000000000000002"),
            U256::from(2),
            1,
        ),
        // Block 3 (unchanged since block_number 1)
        (
            3,
            revm::primitives::address!("0000000000000000000000000000000000000002"),
            U256::from(2),
            1,
        ),
        // Block 4 (unchanged since block_number 1)
        (
            4,
            revm::primitives::address!("0000000000000000000000000000000000000002"),
            U256::from(2),
            1,
        ),
        // Block 5 (unchanged since block_number 1)
        (
            5,
            revm::primitives::address!("0000000000000000000000000000000000000002"),
            U256::from(2),
            1,
        ),
    ] {
        let account = history
            .get_by_block_and_address(&mut txn, history_db, block_number, &address)
            .unwrap();

        assert!(account.is_some_and(|a| a
            == HistoricalAccountData {
                balance: balance,
                nonce: nonce,
                code_hash: revm::primitives::KECCAK_EMPTY,
            }));
    }

    // Assert Account 3 at respective block_numbers (1 - 5)
    for (block_number, address) in vec![
        // Block 1 - non existent
        (
            1,
            revm::primitives::address!("0000000000000000000000000000000000000003"),
        ),
    ] {
        let account = history
            .get_by_block_and_address(&mut txn, history_db, block_number, &address)
            .unwrap();
        assert!(account.is_none());
    }

    for (block_number, address, balance, nonce) in vec![
        // Block 2
        (
            2,
            revm::primitives::address!("0000000000000000000000000000000000000003"),
            U256::from(3),
            3,
        ),
        // Block 3 (unchanged since block_number 2)
        (
            3,
            revm::primitives::address!("0000000000000000000000000000000000000003"),
            U256::from(3),
            3,
        ),
        // Block 4 (unchanged since block_number 2)
        (
            4,
            revm::primitives::address!("0000000000000000000000000000000000000003"),
            U256::from(3),
            3,
        ),
        // Block 5 (unchanged since block_number 2)
        (
            5,
            revm::primitives::address!("0000000000000000000000000000000000000003"),
            U256::from(3),
            3,
        ),
    ] {
        let account = history
            .get_by_block_and_address(&mut txn, history_db, block_number, &address)
            .unwrap();

        assert!(account.is_some_and(|a| a
            == HistoricalAccountData {
                balance: balance,
                nonce: nonce,
                code_hash: revm::primitives::KECCAK_EMPTY,
            }));
    }

    // Assert Account 4 at respective block_numbers (1 - 5)
    for (block_number, address) in vec![
        // Block 1 - non existent
        (
            1,
            revm::primitives::address!("0000000000000000000000000000000000000004"),
        ),
        (
            2,
            revm::primitives::address!("0000000000000000000000000000000000000004"),
        ),
        (
            3,
            revm::primitives::address!("0000000000000000000000000000000000000004"),
        ),
        (
            4,
            revm::primitives::address!("0000000000000000000000000000000000000004"),
        ),
    ] {
        let account = history
            .get_by_block_and_address(&mut txn, history_db, block_number, &address)
            .unwrap();
        assert!(account.is_none());
    }

    for (block_number, address, balance, nonce) in vec![
        // Block 5
        (
            5,
            revm::primitives::address!("0000000000000000000000000000000000000004"),
            U256::from(4),
            4,
        ),
    ] {
        let account = history
            .get_by_block_and_address(&mut txn, history_db, block_number, &address)
            .unwrap();

        assert!(account.is_some_and(|a| a
            == HistoricalAccountData {
                balance: balance,
                nonce: nonce,
                code_hash: revm::primitives::KECCAK_EMPTY,
            }));
    }
}

#[test]
fn test_accounts_history_capacity() {
    let path = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    let db = crate::db::PersistentDB::new(
        crate::db::PersistentDBOptions::new(path.path().to_path_buf()).with_history_size(3),
    )
    .expect("database");

    let history = AccountHistory::new(3);
    let mut txn = db.env.write_txn().unwrap();

    let history_db = &db.inner.borrow().accounts_history.unwrap();

    for i in 0..5 {
        println!("writing i... {}", i);
        // Block 1
        history
            .insert(
                &mut txn,
                history_db,
                i as u64,
                vec![
                    (
                        revm::primitives::address!("0000000000000000000000000000000000000001"),
                        AccountInfo {
                            balance: U256::from(i),
                            nonce: i,
                            ..Default::default()
                        },
                    ),
                    (
                        revm::primitives::address!("0000000000000000000000000000000000000002"),
                        AccountInfo {
                            balance: U256::from(i + 2),
                            nonce: i + 2,
                            ..Default::default()
                        },
                    ),
                ],
            )
            .unwrap();
    }

    // Assert accounts not available below capacity
    for (block_number, address) in vec![
        // Block 0
        (
            0,
            revm::primitives::address!("0000000000000000000000000000000000000001"),
        ),
        // Block 1
        (
            1,
            revm::primitives::address!("0000000000000000000000000000000000000001"),
        ),
    ] {
        let account = history
            .get_by_block_and_address(&mut txn, history_db, block_number, &address)
            .unwrap();
        assert!(account.is_none());
    }

    // Assert accounts found at respective block_numbers (2+)
    for (block_number, address, balance, nonce) in vec![
        // Block 2
        (
            2,
            revm::primitives::address!("0000000000000000000000000000000000000001"),
            U256::from(2),
            2,
        ),
        (
            2,
            revm::primitives::address!("0000000000000000000000000000000000000002"),
            U256::from(4),
            4,
        ),
        // Block 3
        (
            3,
            revm::primitives::address!("0000000000000000000000000000000000000001"),
            U256::from(3),
            3,
        ),
        (
            3,
            revm::primitives::address!("0000000000000000000000000000000000000002"),
            U256::from(5),
            5,
        ),
        // Block 4
        (
            4,
            revm::primitives::address!("0000000000000000000000000000000000000001"),
            U256::from(4),
            4,
        ),
        (
            4,
            revm::primitives::address!("0000000000000000000000000000000000000002"),
            U256::from(6),
            6,
        ),
    ] {
        let account = history
            .get_by_block_and_address(&mut txn, history_db, block_number, &address)
            .unwrap();

        assert!(account.is_some_and(|a| a
            == HistoricalAccountData {
                balance: balance,
                nonce: nonce,
                code_hash: revm::primitives::KECCAK_EMPTY,
            }));
    }

    // Write empty blocks until everything is evicted
    for i in 5..10 {
        // Block 1
        history
            .insert(&mut txn, history_db, i as u64, vec![])
            .unwrap();
    }

    // Assert no accounts in history left
    for i in 0..10 {
        for address in vec![
            revm::primitives::address!("0000000000000000000000000000000000000001"),
            revm::primitives::address!("0000000000000000000000000000000000000002"),
        ] {
            let account = history
                .get_by_block_and_address(&mut txn, history_db, i, &address)
                .unwrap();
            assert!(account.is_none());
        }
    }
}
