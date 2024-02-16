#!/usr/bin/env bash

set -e

# Typography
red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
lila=$(tput setaf 4)
pink=$(tput setaf 5)
blue=$(tput setaf 6)
white=$(tput setaf 7)
black=$(tput setaf 8)

bold=$(tput bold)
reset=$(tput sgr0)

heading ()
{
    echo "    ${lila}==>${reset}${bold} $1${reset}"
}

success ()
{
    echo "    ${green}==>${reset}${bold} $1${reset}"
}

info ()
{
    echo "    ${blue}==>${reset}${bold} $1${reset}"
}

warning ()
{
    echo "    ${yellow}==>${reset}${bold} $1${reset}"
}

error ()
{
    echo "    ${red}==>${reset}${bold} $1${reset}"
}

osCommons() {

# Detect OS and version
OS_ID=$( (grep -w "ID" /etc/os-release)  2>/dev/null | cut -d'=' -f2 )
OS_VERSION=$( (grep -w "VERSION_ID" /etc/os-release)  2>/dev/null | cut -d'=' -f2 | tr -d '"' | cut -d. -f1 )
OS_CODENAME=$( (grep -w "VERSION_CODENAME" /etc/os-release)  2>/dev/null | cut -d'=' -f2 )
OS_NAME=$( (grep -w "PRETTY_NAME" /etc/os-release)  2>/dev/null | cut -d'=' -f2 )

# Ubuntu >= 22 or exit
if [ "$OS_ID" == "ubuntu" ] && [ "$OS_VERSION" -ge "22" ]; then
        success "Runnining install on $OS_NAME"
else
        heading "Only Ubuntu 22.xx or higher is supported!"
        exit 1
fi

#APT Vars
APT_ENV="DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a"


if [[ $(locale -a | grep ^en_US.UTF-8) ]] || [[ $(locale -a | grep ^en_US.utf8) ]]; then
    if ! $(grep -Eq "(en_US.UTF-8)" "$HOME/.bashrc"); then
        # Setting the bashrc locale
        echo "export LC_ALL=en_US.UTF-8" >> "$HOME/.bashrc"
        echo "export LANG=en_US.UTF-8" >> "$HOME/.bashrc"
        echo "export LANGUAGE=en_US.UTF-8" >> "$HOME/.bashrc"

        # Setting the current shell locale
        export LC_ALL="en_US.UTF-8"
        export LANG="en_US.UTF-8"
        export LANGUAGE="en_US.UTF-8"
    fi
else
        # Install en_US.UTF-8 Locale
        sudo locale-gen en_US.UTF-8
        sudo update-locale LANG=en_US.UTF-8
    if ! $(grep -Eq "(en_US.UTF-8)" "$HOME/.bashrc"); then
        # Setting the current shell locale
        export LC_ALL="en_US.UTF-8"
        export LANG="en_US.UTF-8"
        export LANGUAGE="en_US.UTF-8"

        # Setting the bashrc locale
        echo "export LC_ALL=en_US.UTF-8" >> "$HOME/.bashrc"
        echo "export LANG=en_US.UTF-8" >> "$HOME/.bashrc"
        echo "export LANGUAGE=en_US.UTF-8" >> "$HOME/.bashrc"
    fi
fi

heading "Installing system dependencies..."
    sudo apt-get update
    sudo $APT_ENV apt-get install git curl apt-transport-https bc wget gnupg -yq

success "Installed system dependencies!"

heading "Installing node.js & npm..."

    sudo rm -rf /usr/local/{lib/node{,/.npm,_modules},bin,share/man}/{npm*,node*,man1/node*}
    sudo rm -rf ~/{.npm,.forever,.node*,.cache,.nvm}
    (echo -e "Package: nodejs\nPin: origin deb.nodesource.com\nPin-Priority: 999" | sudo tee /etc/apt/preferences.d/nodesource)
    curl -sL  https://deb.nodesource.com/gpgkey/nodesource.gpg.key | gpg --dearmor | sudo tee /usr/share/keyrings/nodesource.gpg >/dev/null
    (echo "deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x ${OS_CODENAME} main" | sudo tee /etc/apt/sources.list.d/nodesource.list)
    sudo apt-get update
    sudo $APT_ENV apt-get install nodejs -yq


success "Installed node.js & npm!"

heading "Installing Pnpm..."

    sudo npm install -g npm@latest
    npm install --prefix=~/.pnpm -g pnpm
    if ! $(grep -Eq "(PNPM_HOME)" "$HOME/.bashrc"); then
        echo 'export PNPM_HOME=~/.pnpm/bin' >> ~/.bashrc
        echo 'export PATH=$PATH:$PNPM_HOME' >> ~/.bashrc
    fi
    export PNPM_HOME=~/.pnpm/bin
    export PATH=$PATH:$PNPM_HOME


success "Installed Pnpm!"

heading "Installing PM2..."

    pnpm i -g pm2
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 500M
    pm2 set pm2-logrotate:compress true
    pm2 set pm2-logrotate:retain 7

success "Installed PM2!"

heading "Installing program dependencies..."

    sudo $APT_ENV apt-get install build-essential pkg-config libtool autoconf automake libpq-dev jq libjemalloc-dev -yq

success "Installed program dependencies!"

heading "Installing system updates..."

    sudo apt-get update
    sudo $APT_ENV apt-get upgrade -yq
    sudo $APT_ENV apt-get dist-upgrade -yq
    sudo apt-get autoremove -yq
    sudo apt-get autoclean -yq

success "Installed system updates!"

}

# Core Server
coreServer() {

heading "Installing Mainsail Core Server..."
# install system deps first
    osCommons

MAINSAIL=$(which mainsail || :)

if [ ! -z "$MAINSAIL" ] ; then
    warning "Cleaning up previous Core Server installations..."
    pnpm rm -g @mainsail/core > /dev/null 2>&1 || true
fi

addCore() {
    while ! pnpm i -g @mainsail/core@${channel:-alpha} ; do
        read -p "Installing Mainsail Core failed, do you want to retry? [y/N]: " choice
            if [[ ! "$choice" =~ ^(yes|y|Y) ]] ; then
                 exit 1
            fi
        done
}

heading "Configuring for custom TestNet ..."

    channel=alpha addCore ${channel} && rm -rf ~/.config/mainsail/ &&  rm -rf ~/.local/state/mainsail/ &&  rm -rf ~/.local/share/mainsail/  && mainsail config:publish:custom --app=https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/main/testnet/mainsail/app.json --crypto=https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/main/testnet/mainsail/crypto.json --peers=https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/main/testnet/mainsail/peers.json --reset && mainsail env:set --key=CORE_P2P_PORT --value=4000 && mainsail env:set --key=CORE_API_DEV_ENABLED --value=true

warning "Cleaning up Pnpm cache .."
    pnpm store prune
success "Installed Mainsail Core!"

}

# API Server
apiServer() {

# check and run osCommons() if needed
NPM=$(which npm || :)

if [ -z "$NPM" ] ; then
    osCommons
fi

addApi() {
    while ! pnpm i -g @mainsail/api@${channel:-alpha} ; do
        read -p "Installing Mainsail API failed, do you want to retry? [y/N]: " choice
            if [[ ! "$choice" =~ ^(yes|y|Y) ]] ; then
                 exit 1
            fi
        done
}

heading "Installing PostgreSQL..."

    sudo apt-get update
    sudo $APT_ENV apt-get install postgresql -yq

success "Installed PostgreSQL!"

readNonempty() {
    prompt=${1}
    answer=""
    while [ -z "${answer}" ] ; do
        read -p "${prompt}" answer
    done
    echo "${answer}"
}

# setup postgres username, password and database
read -p "Would you like to configure the database? [y/N]: " choice

if [[ "$choice" =~ ^(yes|y|Y) ]]; then
    choice=""
    while [[ ! "$choice" =~ ^(yes|y|Y) ]] ; do
        databaseUsername=$(readNonempty "Enter the database username: ")
        databasePassword=$(readNonempty "Enter the database password: ")
        databaseName=$(readNonempty "Enter the database name: ")

        echo "database username: ${databaseUsername}"
        echo "database password: ${databasePassword}"
        echo "database name: ${databaseName}"
        read -p "Proceed? [y/N]: " choice
    done

    userExists=$(sudo -i -u postgres psql -tAc "SELECT 1 FROM pg_user WHERE usename = '${databaseUsername}'")
    databaseExists=$(sudo -i -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${databaseName}'")
checkData() {
    f_data=$(sudo -i -u postgres psql -tAc "SELECT 1 FROM pg_tables WHERE schemaname = 'public' LIMIT 1" ${databaseName})
    echo $f_data
}
checkTables() {
    f_tables=$(sudo -i -u postgres psql -tAc "SELECT tablename FROM pg_tables WHERE schemaname = 'public'" ${databaseName})
    echo $f_tables
}
    if [[ $userExists == 1 ]]; then
        read -p "The database user ${databaseUsername} already exists, do you want to recreate it? [y/N]: " choice
        choice="${choice:=N}"
        if [[ "$choice" =~ ^(yes|y|Y) ]]; then
            if [[ $databaseExists == 1 ]]; then
                sudo -i -u postgres psql -c "ALTER DATABASE ${databaseName} OWNER TO postgres" ${databaseName}
		dataExists=$(checkData)
		if [[ $dataExists == 1 ]]; then
		    warning "Data dependencies found. Transfering ownership to postgres ... "
		    tables=$(checkTables)
	            for table in ${tables}
		    do
		    sudo -i -u postgres psql -c "ALTER table public.${table} owner to postgres" ${databaseName}
	       	    done
		fi
            fi
            sudo -i -u postgres psql -c "DROP USER ${databaseUsername}"
            sudo -i -u postgres psql -c "CREATE USER ${databaseUsername} WITH PASSWORD '${databasePassword}' CREATEDB;"
        fi
    else
        sudo -i -u postgres psql -c "CREATE USER ${databaseUsername} WITH PASSWORD '${databasePassword}' CREATEDB;"
    fi

    if [[ $databaseExists == 1 ]]; then
        read -p "The database ${databaseName} already exists, do you want to overwrite it? [y/N]: " choice
        choice="${choice:=N}"
        if [[ "$choice" =~ ^(yes|y|Y) ]]; then
            sudo -i -u postgres psql -c "DROP DATABASE ${databaseName};"
            sudo -i -u postgres psql -c "CREATE DATABASE ${databaseName} WITH OWNER ${databaseUsername};"
        elif [[ "$choice" =~ ^(no|n|N) ]]; then
            sudo -i -u postgres psql -c "ALTER DATABASE ${databaseName} OWNER TO ${databaseUsername};"
	    dataExists=$(checkData)
            if [[ $dataExists == 1 ]]; then
		 warning "Data dependencies found. Transfering ownership to ${databaseUsername} ... "
		 tables=$(checkTables)
                 for table in ${tables}
                 do
                 sudo -i -u postgres psql -c "ALTER table public.${table} owner to ${databaseUsername}" ${databaseName}
                 done
            fi
        fi
    else
        sudo -i -u postgres psql -c "CREATE DATABASE ${databaseName} WITH OWNER ${databaseUsername};"
    fi
fi

heading "Installing Mainsail API Server..."

API=$(which mainsail-api || :)

if [ ! -z "$API" ] ; then
    warning "Cleaning up previous API Server installations..."
    pnpm rm -g @mainsail/api > /dev/null 2>&1 || true
fi

    channel=alpha addApi ${channel} && rm -rf ~/.config/mainsail-api/ &&  rm -rf ~/.local/state/mainsail-api/ &&  rm -rf ~/.local/share/mainsail-api/ && mainsail-api config:publish --network=testnet --reset && mainsail-api env:set --key=CORE_DB_USERNAME --value="${databaseUsername}" && mainsail-api env:set --key=CORE_DB_PASSWORD --value="${databasePassword}" && mainsail-api env:set --key=CORE_DB_DATABASE --value="${databaseName}"

warning "Cleaning up Pnpm cache .."
    pnpm store prune
success "Installed Mainsail API Server!"

#add API capabilities to Core
read -p "Are you going to run the backend Core server on the same node? [y/N]: " choice

CORE=$(which mainsail || :)

if [[ "$choice" =~ ^(yes|y|Y) ]]; then
	if [ -z "$CORE" ] ; then
	   coreServer
        fi
heading "Configuring ..."

        rm -rf ~/.config/mainsail/ && rm -rf ~/.local/state/mainsail/ && rm -rf ~/.local/share/mainsail/ && mainsail config:publish:custom --app=https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/main/testnet/mainsail/api-app.json --crypto=https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/main/testnet/mainsail/crypto.json --peers=https://raw.githubusercontent.com/ArkEcosystem/mainsail-network-config/main/testnet/mainsail/peers.json --reset
	mainsail env:set --key=CORE_P2P_PORT --value=4000
	mainsail env:set --key=CORE_API_DEV_ENABLED --value=true
	mainsail env:set --key=CORE_DB_USERNAME --value="${databaseUsername}"
       	mainsail env:set --key=CORE_DB_PASSWORD --value="${databasePassword}"
	mainsail env:set --key=CORE_DB_DATABASE --value="${databaseName}"

success "Configured ..."
else
    warning "Please refer to documentation on confiruging Core with remote API Server!"
fi
}

usage() {
 echo "Usage: $0 [FLAGS]"
 echo "Flags:"
 echo " --api Install API Server"
 echo " ${red}${bold}-- NO FLAGS for plain Core install! --${reset}"
}

handle_flags() {
  while [ $# -gt 0 ]; do
    case $1 in
      -h | --help |?)
        usage
        exit 0
        ;;
      --api)
        apiServer
        shift
        ;;
      *)
        echo "Invalid flags: $1" >&2
        usage
        exit 1
        ;;
    esac
    shift
  done
}

handle_flags "$@"
coreServer

exec "$BASH"

