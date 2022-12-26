import {Command, Flags} from '@oclif/core'
import * as fs from 'fs';
import * as path from 'path'

import {
    generatePrivateKey, 
    getPublicKey,
} from 'nostr-tools'

export default class Init extends Command {
  static description = 'initializes a config file to store the public/private key pair to interact with nostr'

  static examples = [
    `$ nostr-fs init
    $ nostr-fs init --force
`,
  ]

  static flags = {
    force: Flags.boolean({char: 'f', default: false, description: 'force init', required: false}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Init)

    fs.open(path.join(this.config.configDir, 'config.json'), 'r', (err, fd) => {
      if (flags.force || (err && err.code === 'ENOENT')) {
          // file does not exist (or force used). safe to create it.
          const sk = generatePrivateKey()
          const pk = getPublicKey(sk)

          fs.writeFileSync(path.join(this.config.configDir, 'config.json'), JSON.stringify({
            pk: pk,
            sk: sk
          }));
          
          return;
      }

      this.warn("config.json already exists. please use `nostr-fs init --force` to force re-initialize")
    });
  }
}