# Mainsail - EVM Contracts

![banner](https://raw.githubusercontent.com/ArkEcosystem/mainsail/main/banner.png)

## Documentation

You can find installation instructions and detailed instructions on how to use this package at the [dedicated documentation site](https://ark.dev/docs/mainsail).

### Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

-   **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
-   **Chisel**: Fast, utilitarian, and verbose solidity REPL.

### Documentation

https://book.getfoundry.sh/

### Usage

#### Build

```shell
$ forge build
```

#### Test

```shell
$ forge test
```

#### Format

```shell
$ forge fmt
```

#### Gas Snapshots

```shell
$ forge snapshot
```

#### Anvil

```shell
$ anvil
```

#### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

#### Cast

```shell
$ cast <subcommand>
```

#### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

## Security

If you discover a security vulnerability within this package, please send an e-mail to [security@ark.io](mailto:security@ark.io). All security vulnerabilities will be promptly addressed.

## Credits

This project exists thanks to all the people who [contribute](https://github.com/ArkEcosystem/mainsail/graphs/contributors).

## License

[GPL-3.0-only](https://github.com/ArkEcosystem/mainsail/blob/main/LICENSE) © [ARK Ecosystem](https://ark.io)
