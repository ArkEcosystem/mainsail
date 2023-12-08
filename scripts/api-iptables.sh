#!/usr/bin/env bash
API_GLOBAL=4003
API_GLOBAL_RATE=300/second
API_GLOBAL_BURST=100

API_DEV_GLOBAL=4006
API_DEV_GLOBAL_RATE=300/second
API_DEV_GLOBAL_BURST=100

API_TRANSACTION_POOL_GLOBAL=4007
API_TRANSACTION_POOL_GLOBAL_RATE=20/second
API_TRANSACTION_POOL_GLOBAL_BURST=10

# Initialize limiter
# $1=NAME $2=PORT $3=RATE $4=BURST
start_limit() {

table=$(sudo iptables -nL $1 2> /dev/null)
myip=$(ip -o route get to 1.1.1.1 | sed -n 's/.*src \([0-9.]\+\).*/\1/p')

if [[ $table ]]; then
    sudo iptables -F $1
    sudo iptables --append $1 --match limit --limit $3 --limit-burst $4 -j ACCEPT
    sudo iptables -A $1 -j REJECT
    echo "API Connection Limits exist, resetting rules..."
    echo "Done!"
else
    echo "Applying API Connection Limits..."
    sudo iptables -N $1
    sudo iptables -I INPUT --match conntrack --ctstate NEW -p tcp -d $myip --dport $2 -j $1
    sudo iptables --append $1 --match limit --limit $3 --limit-burst $4 -j ACCEPT
    sudo iptables -A $1 -j REJECT
    echo "Done!"
fi
}

# Stop limiter
# $1=NAME $2=PORT
stop_limit() {

table=$(sudo iptables -nL $1 2> /dev/null)
myip=$(ip -o route get to 1.1.1.1 | sed -n 's/.*src \([0-9.]\+\).*/\1/p')

if [[ $table ]]; then
    sudo iptables -F $1
    sudo iptables -D INPUT --match conntrack --ctstate NEW -p tcp -d $myip --dport $2 -j $1 > /dev/null 2>&1
    sudo iptables -X $1
    echo "Removed API Connection Limits! ${table}"
fi

}

# $1=NAME
is_enabled() {

table=$(sudo iptables -nL $1 2> /dev/null)
rate=$(sudo iptables -vxnL $1 1 | awk '{print $12}')
burst=$(sudo iptables -vxnL $1 1 | awk '{print $14}')

if [[ $table ]]; then
    echo "Status: Enabled"
    echo "Connection rate limit: ${rate}"
    echo "Connection burst limit: ${burst}"
else
    echo "Status: Disabled"
fi

}

case "$2" in
    api) arg_name=API_LIMIT; arg_port=$API_GLOBAL; arg_rate=$API_GLOBAL_RATE; arg_burst=$API_GLOBAL_BURST ;;
    dev) arg_name=API_DEV; arg_port=$API_DEV_GLOBAL; arg_rate=$API_DEV_GLOBAL_RATE; arg_burst=$API_DEV_GLOBAL_BURST ;;
    pool) arg_name=API_POOL; arg_port=$API_TRANSACTION_POOL_GLOBAL; arg_rate=$API_TRANSACTION_POOL_GLOBAL_RATE; arg_burst=$API_TRANSACTION_POOL_GLOBAL_BURST ;;
    *) echo "usage: $0 start|stop|restart|status api|dev|pool" >&2
       exit 1
       ;;
esac

case "$1" in
    start)   start_limit $arg_name $arg_port $arg_rate $arg_burst ;;
    stop)    stop_limit $arg_name $arg_port ;;
    restart) stop_limit $arg_name ; start_limit $arg_name $arg_port $arg_rate $arg_burst ;;
    status)  is_enabled $arg_name ;;
    *) echo "usage: $0 start|stop|restart|status api|dev|pool" >&2
       exit 1
       ;;
esac
