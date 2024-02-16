#!/usr/bin/env bash
#mainnet_port P2P_GLOBAL=4001 / devnet_port P2P_GLOBAL=4002 / testnet_port P2P_GLOBAL=4000
P2P_GLOBAL=4000
P2P_GLOBAL_CONN=10
#for docker operation set DOCKER=true
DOCKER=false

#do not edit below this line

d_check=$(which docker || :)

if [[ $DOCKER == "true" ]] && [[ -z "$d_check" ]]; then
   echo "Couldn't find docker. Please set 'DOCKER=false' for normal operation"
   exit 1
fi

globals() {

table=$(sudo iptables -nL P2P_LIMIT 2> /dev/null)

if [[ $DOCKER == "true" ]]; then
    c_name=$(docker ps -a -q -f name=mainsail --format "{{.Names}}")
    myip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${c_name})
    ipt="DOCKER-USER"
else
    myip=$(ip -o route get to 1.1.1.1 | sed -n 's/.*src \([0-9.]\+\).*/\1/p')
    ipt="INPUT"
fi

params=( "${table}" "${myip}" "${ipt}" )

}

#Initialize p2p limiter
start_limit() {

globals
table=${params[0]}
myip=${params[1]}
ipt=${params[2]}

if [[ $table ]]; then
    sudo iptables -F P2P_LIMIT
    sudo iptables -A P2P_LIMIT -p tcp --syn -m connlimit --connlimit-above ${P2P_GLOBAL_CONN} --connlimit-mask 32 -j REJECT --reject-with tcp-reset
    sudo iptables -A P2P_LIMIT -m state --state NEW -m recent --set
    sudo iptables -A P2P_LIMIT -m state --state NEW -m recent --update --seconds 30 --hitcount 4 -j DROP #Allow 4 new connections every 30 sec
    sudo iptables -A P2P_LIMIT -p tcp -j ACCEPT
    echo "Connection Limits exist, resetting rules..."
    echo "Done!"
else
    echo "Applying Connection Limits..."
    sudo iptables -N P2P_LIMIT
    sudo iptables -I $ipt -p tcp -d $myip --dport ${P2P_GLOBAL} -j P2P_LIMIT
    sudo iptables -A P2P_LIMIT -p tcp --syn -m connlimit --connlimit-above ${P2P_GLOBAL_CONN} --connlimit-mask 32 -j REJECT --reject-with tcp-reset
    sudo iptables -A P2P_LIMIT -m state --state NEW -m recent --set
    sudo iptables -A P2P_LIMIT -m state --state NEW -m recent --update --seconds 30 --hitcount 4 -j DROP #Allow 4 new connections every 30 sec
    sudo iptables -A P2P_LIMIT -p tcp -j ACCEPT
    echo "Done!"
fi

}

#Stop limiter
stop_limit() {

globals
table=${params[0]}
myip=${params[1]}
ipt=${params[2]}

if [[ $table ]]; then
    sudo iptables -F P2P_LIMIT
    sudo iptables -D $ipt -p tcp -d $myip --dport ${P2P_GLOBAL} -j P2P_LIMIT > /dev/null 2>&1
    sudo iptables -X P2P_LIMIT
    echo "Removed Connection Limits!"
fi

}

is_enabled() {

table=$(sudo iptables -nL P2P_LIMIT 2> /dev/null)
gconn=$(sudo iptables -vxnL P2P_LIMIT 1 | awk '{print $1}')
nconn=$(sudo iptables -vxnL P2P_LIMIT 3 | awk '{print $1}')

if [[ $table ]]; then
    echo "Status: Enabled"
    echo "Connection limit per IP: ${gconn} dropped packets"
    echo "New connections per 30 sec: ${nconn} dropped packets"
else
    echo "Status: Disabled"
fi

}

case "$1" in
    start)   start_limit ;;
    stop)    stop_limit;;
    restart) stop_limit; start_limit ;;
    status)  is_enabled;;
    *) echo "usage: $0 start|stop|restart|status" >&2
       exit 1
       ;;
esac
