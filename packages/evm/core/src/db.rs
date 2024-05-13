use std::{borrow::Cow, collections::HashMap, convert::Infallible, path::PathBuf};

use heed::EnvOpenOptions;
use revm::{db::CacheDB, primitives::*, Database, DatabaseCommit, DatabaseRef};

#[derive(Debug)]
struct AddressWrapper(Address);
impl heed::BytesEncode<'_> for AddressWrapper {
    type EItem = AddressWrapper;

    fn bytes_encode(item: &Self::EItem) -> Result<Cow<[u8]>, heed::BoxedError> {
        Ok(Cow::Borrowed(item.0.as_slice()))
    }
}

#[derive(Debug)]
struct ContractWrapper(B256);
impl heed::BytesEncode<'_> for ContractWrapper {
    type EItem = ContractWrapper;

    fn bytes_encode(item: &Self::EItem) -> Result<Cow<[u8]>, heed::BoxedError> {
        Ok(Cow::Borrowed(item.0.as_slice()))
    }
}

type HeedHeight = heed::types::U64<heed::byteorder::LittleEndian>;
type HeedRound = heed::types::U64<heed::byteorder::LittleEndian>;

pub struct PersistentDB {
    env: heed::Env,
    accounts: heed::Database<AddressWrapper, heed::types::SerdeJson<AccountInfo>>,
    commits: heed::Database<HeedHeight, HeedRound>,
    contracts: heed::Database<ContractWrapper, heed::types::SerdeJson<Bytecode>>,
    storage: heed::Database<AddressWrapper, heed::types::SerdeJson<Storage>>,
}

pub struct EphemeralDB<'a> {
    cache_db: CacheDB<&'a PersistentDB>,
}

impl<'a> EphemeralDB<'a> {
    pub fn new(persistent_db: &'a PersistentDB) -> Self {
        Self {
            cache_db: CacheDB::new(persistent_db),
        }
    }
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("IO error")]
    IO(#[from] std::io::Error),
    #[error("heed error")]
    Heed(#[from] heed::Error),
    #[error("infallible error")]
    Infallible(#[from] Infallible),
}

impl PersistentDB {
    pub fn new(path: PathBuf) -> Result<Self, Error> {
        std::fs::create_dir_all(&path)?;

        let mut env_builder = EnvOpenOptions::new();
        env_builder.max_dbs(4);

        let env = unsafe { env_builder.open(path) }?;

        let tx_env = env.clone();
        let mut wtxn = tx_env.write_txn()?;

        let accounts = env.create_database::<AddressWrapper, heed::types::SerdeJson<AccountInfo>>(
            &mut wtxn,
            Some("accounts"),
        )?;
        let commits = env.create_database::<HeedHeight, HeedRound>(&mut wtxn, Some("commits"))?;
        let contracts = env.create_database::<ContractWrapper, heed::types::SerdeJson<Bytecode>>(
            &mut wtxn,
            Some("contracts"),
        )?;
        let storage = env.create_database::<AddressWrapper, heed::types::SerdeJson<Storage>>(
            &mut wtxn,
            Some("storage"),
        )?;

        wtxn.commit()?;

        Ok(Self {
            env,
            accounts,
            commits,
            contracts,
            storage,
        })
    }
}

impl Database for PersistentDB {
    type Error = Error;

    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        <Self as DatabaseRef>::basic_ref(self, address)
    }

    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        <Self as DatabaseRef>::code_by_hash_ref(self, code_hash)
    }

    fn storage(&mut self, address: Address, index: U256) -> Result<U256, Self::Error> {
        <Self as DatabaseRef>::storage_ref(self, address, index)
    }

    fn block_hash(&mut self, number: U256) -> Result<B256, Self::Error> {
        <Self as DatabaseRef>::block_hash_ref(self, number)
    }
}

impl DatabaseRef for PersistentDB {
    type Error = Error;

    fn basic_ref(&self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        let txn = self.env.read_txn()?;

        let basic = match self.accounts.get(&txn, &AddressWrapper(address))? {
            Some(account) => account,
            None => AccountInfo::default(),
        };

        Ok(basic.into())
    }

    fn code_by_hash_ref(&self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        let txn = self.env.read_txn()?;

        let contract = match self.contracts.get(&txn, &ContractWrapper(code_hash))? {
            Some(contract) => contract,
            None => Default::default(),
        };

        Ok(contract)
    }

    fn storage_ref(&self, address: Address, index: U256) -> Result<U256, Self::Error> {
        let txn = self.env.read_txn()?;

        let address = AddressWrapper(address);
        match self.accounts.get(&txn, &address)? {
            Some(_) => match self.storage.get(&txn, &address)? {
                Some(storage) => Ok(storage
                    .get(&index)
                    .map_or_else(|| U256::ZERO, |s| s.present_value())),
                None => Ok(U256::ZERO),
            },
            None => Ok(U256::ZERO),
        }
    }

    fn block_hash_ref(&self, _number: U256) -> Result<B256, Self::Error> {
        todo!()
    }
}

impl PersistentDB {
    pub fn commit(
        &mut self,
        height: u64,
        round: u64,
        mut changes: Vec<HashMap<Address, Account>>,
    ) -> Result<(), Error> {
        assert!(!self.is_height_committed(height));

        let mut rwtxn = self.env.write_txn()?;

        let mut apply_changes = |rwtxn: &mut heed::RwTxn| -> Result<(), Error> {
            for change in changes.drain(..) {
                for (address, mut account) in change {
                    let address = AddressWrapper(address);

                    if !account.is_touched() {
                        continue;
                    }
                    if account.is_selfdestructed() {
                        self.accounts.delete(rwtxn, &address)?;
                        continue;
                    }

                    let is_newly_created = account.is_created();
                    insert_contract(rwtxn, &mut self.contracts, &mut account.info)?;

                    self.accounts.put(rwtxn, &address, &account.info)?;

                    // println!("put account {:?}", account.info);

                    let mut account_storage =
                        self.storage.get(rwtxn, &address)?.unwrap_or_default();

                    if is_newly_created {
                        account_storage.clear();
                    }

                    account_storage.extend(account.storage);

                    self.storage.put(rwtxn, &address, &account_storage)?;
                }
            }

            self.commits.put(rwtxn, &height, &round)?;

            Ok(())
        };

        if let Err(err) = apply_changes(&mut rwtxn) {
            rwtxn.abort();
            return Err(err.into());
        }

        rwtxn.commit()?;
        Ok(())
    }

    pub fn is_height_committed(&self, height: u64) -> bool {
        let env = self.env.clone();
        let rtxn = env.read_txn().expect("read");

        self.commits.get(&rtxn, &height).is_ok_and(|v| v.is_some())
    }
}

fn insert_contract(
    rwtxn: &mut heed::RwTxn,
    contracts: &mut heed::Database<ContractWrapper, heed::types::SerdeJson<Bytecode>>,
    account: &mut AccountInfo,
) -> Result<(), Error> {
    if let Some(code) = &account.code {
        if !code.is_empty() {
            if account.code_hash == KECCAK_EMPTY {
                account.code_hash = code.hash_slow();
            }
            contracts.put(rwtxn, &ContractWrapper(account.code_hash), code)?;
        }
    }
    if account.code_hash == B256::ZERO {
        account.code_hash = KECCAK_EMPTY;
    }

    Ok(())
}

impl<'a> Database for EphemeralDB<'a> {
    type Error = Error;

    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        self.cache_db.basic(address)
    }

    fn code_by_hash(&mut self, code_hash: B256) -> Result<Bytecode, Self::Error> {
        self.cache_db.code_by_hash(code_hash)
    }

    fn storage(&mut self, address: Address, index: U256) -> Result<U256, Self::Error> {
        self.cache_db.storage(address, index)
    }

    fn block_hash(&mut self, number: U256) -> Result<B256, Self::Error> {
        self.cache_db.block_hash(number)
    }
}

impl<'a> DatabaseCommit for EphemeralDB<'a> {
    fn commit(&mut self, changes: HashMap<Address, Account>) {
        self.cache_db.commit(changes)
    }
}

#[test]
fn test_open_db() {
    let tmp = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    assert!(PersistentDB::new(tmp.path().to_path_buf()).is_ok());
}

#[test]
fn test_commit_changes() {
    let path = tempfile::Builder::new()
        .prefix("evm.mdb")
        .tempdir()
        .unwrap();

    let mut db = PersistentDB::new(path.path().to_path_buf()).expect("database");

    // 1) Lookup empty account
    let address = address!("bd6f65c58a46427af4b257cbe231d0ed69ed5508");
    let account = db.basic(address).expect("works").expect("account info");

    assert_eq!(
        account.code_hash,
        FixedBytes(hex!(
            "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
        ))
    );

    // 2) Update balance for account
    let mut changes = HashMap::new();

    let mut account = Account::new_not_existing();
    account.info.balance = U256::from(100);
    account.status = AccountStatus::Touched;

    changes.insert(address, account);
    let result = db.commit(0, 0, vec![changes]);
    assert!(result.is_ok());

    // 3) Assert updated balance
    let account = db.basic(address).expect("works").expect("account info");
    assert_eq!(account.balance, U256::from(100));
}
