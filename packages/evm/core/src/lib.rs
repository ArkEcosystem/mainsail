use std::path::PathBuf;

use db::PersistentDB;
use revm::Evm;

pub mod constants;
pub mod db;

pub type EvmInstance = Evm<'static, (), PersistentDB>;

pub fn create_evm_instance(path: PathBuf) -> EvmInstance {
    let db = PersistentDB::new(path).expect("path ok");

    let evm = Evm::builder()
        .with_db(db)
        .modify_env(|_env| {
            // Configure EVM env defaults
        })
        .build();

    evm
}
