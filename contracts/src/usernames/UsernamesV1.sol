// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.27;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract UsernamesV1 is UUPSUpgradeable, OwnableUpgradeable {
    error InvalidUsername();
    error TakenUsername();
    error UsernameNotRegistered();

    event UsernameRegistered(address addr, string username, string previousUsername);

    event UsernameResigned(address addr, string username);

    struct User {
        address addr;
        string username;
    }

    mapping(address => string) private _usernames;
    mapping(bytes32 => bool) private _usernameExists;

    // Initializers
    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    // Overrides
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // External functions
    function addUsername(address user, string memory username) external onlyOwner {
        bytes memory b = bytes(username);
        // Full username verification is intentionally skipped for backwards compatibility
        if (b.length < 1 || b.length > 20) {
            revert InvalidUsername();
        }

        _registerUsername(user, username, b);
    }

    function registerUsername(string memory username) external {
        // Register username
        bytes memory b = bytes(username);
        if (!_verifyUsername(b)) {
            revert InvalidUsername();
        }

        _registerUsername(msg.sender, username, b);
    }

    function resignUsername() external {
        string memory username = _usernames[msg.sender];
        // If user already has a username
        if (bytes(username).length > 0) {
            _usernameExists[keccak256(bytes(_usernames[msg.sender]))] = false;
            delete _usernames[msg.sender];

            emit UsernameResigned(msg.sender, username);
        } else {
            revert UsernameNotRegistered();
        }
    }

    // External functions that are view
    function version() external pure returns (uint256) {
        return 1;
    }

    function getUsername(address user) external view returns (string memory) {
        return _usernames[user];
    }

    function isUsernameRegistered(string memory username) external view returns (bool) {
        return _usernameExists[keccak256(bytes(username))];
    }

    function isUsernameValid(string memory username) external pure returns (bool) {
        return _verifyUsername(bytes(username));
    }

    function getUsernames(address[] calldata addresses) external view returns (User[] memory) {
        User[] memory users = new User[](addresses.length);
        uint256 count = 0;
        for (uint256 i = 0; i < addresses.length; i++) {
            if (bytes(_usernames[addresses[i]]).length != 0) {
                users[count++] = User(addresses[i], _usernames[addresses[i]]);
            }
        }

        // Slice the array to remove empty slots
        User[] memory result = new User[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = users[i];
        }

        return result;
    }

    // Internal function
    // RULES:
    // minimum length of 1 character
    // maximum length of 20 characters
    // only lowercase letters, numbers and underscores are allowed
    // cannot start or end with underscore
    // cannot contain two or more consecutive underscores
    function _verifyUsername(bytes memory username) internal pure returns (bool) {
        // minimum length of 1 character
        // maximum length of 20 characters
        if (username.length < 1 || username.length > 20) {
            return false;
        }

        // cannot start or end with underscore
        if (username[0] == 0x5F || username[username.length - 1] == 0x5F) {
            return false;
        }

        for (uint256 i = 0; i < username.length; i++) {
            // only lowercase letters, numbers and underscores are allowed
            if (
                !(username[i] >= 0x30 && username[i] <= 0x39) // 0-9
                    && !(username[i] >= 0x61 && username[i] <= 0x7A) // a-z
                    && !(username[i] == 0x5F) // _
            ) {
                return false;
            }

            // No need to care out ot bound access at i + 1, because previous test already check that latest character is not underscore
            if (username[i] == 0x5F && username[i + 1] == 0x5F) {
                return false;
            }
        }

        return true;
    }

    function _registerUsername(address user, string memory username, bytes memory b) internal {
        bytes32 usernameHash = keccak256(b);
        if (_usernameExists[usernameHash]) {
            revert TakenUsername();
        }

        string memory previousUsername = _usernames[user];
        // If user already has a username
        if (bytes(previousUsername).length > 0) {
            _usernameExists[keccak256(bytes(previousUsername))] = false; // Remove old username
        }

        _usernames[user] = username;
        _usernameExists[usernameHash] = true;

        emit UsernameRegistered(user, username, previousUsername);
    }
}
