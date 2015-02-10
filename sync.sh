#!/bin/sh
set -ex

local=./
remote=192.168.33.11
path=/projects/peers
user=${4:-root}

sync_command="date +%H:%M:%S && rsync -iru --exclude .git --exclude node_modules --exclude out --exclude dist --exclude app/styles/*.css --exclude app/components --progress --itemize-changes --update --delete --chmod=Du=rwx,Dg=rwx,Do=rwx,Fu=rwx,Fg=rwx,Fo=rwx -p $local -e ssh $user@$remote:$path"
sh -c "$sync_command"
fswatch $local "$sync_command"
