import 'websocket-polyfill'
import { BaseCommand } from '../../baseCommand'
import {decode as b64decode} from 'base64-arraybuffer'

import {
  nip04,
  relayInit,
  getPublicKey,
  Event,
  Sub
} from 'nostr-tools'
import NostrFileSystem, { NostrFile } from '../../fileSystem'
import { CLIError } from '@oclif/errors'

export default class Ls extends BaseCommand<typeof Ls> {
  
  static description = 'lists contents of all directories (starting at root)'

  async run(): Promise<void> {
    if (this.norun) {
      this.exit(1);
    }

    // TODO: handle path arg
    // const {args, flags} = await this.parse(Ls)
    // let path = args.path;
    // if (!path) {
    //   path = __dirname;
    //   console.log("path not set, showing root /");
    // }

    let events: Event[] = [];
    
    this.relay.connect();
    let sub: Sub;

    this.relay.on('connect', () => {
        sub = this.relay.sub([
            {
              kinds: [ 1 ],
              authors: [ this.keys.pk ]
            }
          ], {}
        )
        sub.on('event', (event: Event) => {
            events.push(event);
        })
        sub.on('eose', async () => {
            const fileSystem: NostrFileSystem = new NostrFileSystem();
            // construct file system with all received events
            for (let evt of events) {
                const decryptedContent = await nip04.decrypt(this.keys.sk, this.keys.pk, evt.content);
                let file: NostrFile = JSON.parse(decryptedContent)
                try { 
                    fileSystem.update(file);
                } catch (err: any) {
                    throw new CLIError(err);
                }
            }
            const keys = fileSystem.fs.keys();
            for (const key of keys) {
              const val = fileSystem.fs.get(key);
              if (!val) { continue; }

              if (val.dir) {
                console.log("[d] " + key);
              }
              else {
                let size = b64decode(val.data).byteLength
                // @ts-ignore
                console.log("[f] " + val.parent + "/" + val?.name + " " + size + "B " + new Date(1000 * val.createdAt).toISOString());
              }
            }
            
            sub.unsub();
            this.relay.close()
        })
    })
    this.relay.on('notice', (notice: any) => {
      console.log(`received notice from ${this.relay.url} ${notice}`)
      this.relay.close();
    })
  }
}
