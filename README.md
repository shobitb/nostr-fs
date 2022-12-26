# nostr-fs

command-line tool for a (pseudo) file-system over [nostr](https://github.com/nostr-protocol/nostr)

this is an experimental project. use at your own risk!

note - all files are encrypted. only files reside on nostr relays; directories are a "view-only" concept in this client, not backed by any real nostr events.

## Commands

### `init`
initializes a config file to store the public/private key pair to interact with nostr. generates the file and key pair if not existing. config is stored at `~/.config/nostr-fs/config.json` (MacOS). does not overwrite the file if it exists, unless the `--force` flag is used.

> WARNING: `--force` will delete the existing config. please back up your config before running `init --force`.

### `ls`
lists the contents of all directories (starting at 'root'). 

### `cp`

copies a source file from a local absolute path to a nostr-fs path.

## Development/Contribution
contributions are welcome!

built using node v19.3.0.

project uses [oclif](https://oclif.io/) for the CLI framework. 

for development, pull package locally and run the commands under `src/commands/nostr-fs` using 
`$ ./bin/dev nostr-fs <command>`

## Future Work
- support for more commands
  - [ ] cp from nostr-fs to local
  - [ ] find
  - [ ] rm
- replicate across multiple relays
- tests