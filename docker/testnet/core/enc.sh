#!/usr/bin/env bash
############################################################
#                                                          #
# This script encrypts your validator secret and password. #
#                                                          #
############################################################

type openssl >/dev/null 2>&1 || { echo >&2 "OpenSSL missing. Please install and run the script again."; exit 1; }

yellow=$(tput setaf 3)
green=$(tput setaf 2)
blue=$(tput setaf 6)
lila=$(tput setaf 4)
bold=$(tput bold)
reset=$(tput sgr0)

heading ()
{
    echo "    ${lila}==>${reset}${bold} $1${reset}"
}

info ()
{
    echo "    ${blue}==>${reset}${bold} $1${reset}"
}

warning ()
{
    echo "    ${yellow}==>${reset}${bold} $1${reset}"
}

success ()
{
    echo "    ${green}==>${reset}${bold} $1${reset}"
}

pass() {
    while true; do
        read -sp "Please enter your password: " inputPass
        echo
        read -sp "Please enter password again: " inputPassA
        echo
        [ "${inputPass}" = "${inputPassA}" ] && break
        echo "Password do not match! Please try again."
        done
}

bls() {
    read -sp "Please enter your validator BLS12-381 private key: " inputKey
    echo
    if [[ ! ${inputKey} =~ ^[0-9a-fA-F]{64}$ ]]; then
        echo "Sorry, it doesn't look to be a valid private key."
        exit 1
    fi
    pass

}

bip39() {
    read -sp "Please enter your passphrase: " inputSecret
    echo
    word_count=$(echo ${inputSecret} | wc -w)
    if [[ ! ${word_count} =~ ^(12|24)$ ]]; then
        echo "Invalid number of words in secret."
        exit 1
    fi	
    pass
}

heading "Select type of validator secret:"
info "BLS => A validator private key. Referred to as BLS12-381."
info "BIP39 => A validator plain text passphrase. Referred to as BIP39."

select secret_type in "BLS" "BIP39"; do
    case $secret_type in
        BLS)
            bls; break;;
        BIP39)
            bip39; break;;
        *)
            echo "Invalid selection";
    esac
done

BLS="${inputKey}"
SECRET="${inputSecret}"
BIP38="${inputPass}"

rm -rf enc > /dev/null 2>&1
mkdir enc; cd enc

warning "Encrypting ..."

if [ -n "$BLS" ]; then
    openssl genrsa -out bls.key 2048
    openssl rsa -in bls.key -out bls.pub -outform PEM -pubout
    echo "${BLS}" | openssl pkeyutl -encrypt -inkey bls.pub -pubin -out bls.dat

elif [ -n "$SECRET" ]; then
    openssl genrsa -out secret.key 2048
    openssl rsa -in secret.key -out secret.pub -outform PEM -pubout
    echo "${SECRET}" | openssl pkeyutl -encrypt -inkey secret.pub -pubin -out secret.dat
else
    echo "Coudn't find BLS12-381 key, nor plain text passphrase to encrypt."
    exit 1
fi

openssl genrsa -out bip.key 2048
openssl rsa -in bip.key -out bip.pub -outform PEM -pubout
echo "${BIP38}" | openssl pkeyutl -encrypt -inkey bip.pub -pubin -out bip.dat

success "Done! Created folder $(echo "${lila}enc${reset}") with all certificates and keys inside."
success "You are now ready to run your docker $(echo "${yellow}validator node")."

