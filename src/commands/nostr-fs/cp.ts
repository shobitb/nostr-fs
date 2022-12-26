import 'websocket-polyfill'
import * as fs from 'fs';
import { BaseCommand } from '../../baseCommand'
import {
    nip04,
    signEvent,
    relayInit,
    getEventHash,
    Event,
    Sub,
    Relay
} from 'nostr-tools'
import NostrFileSystem, {NostrFile} from '../../fileSystem';
import { CLIError } from '@oclif/errors';

export default class Cp extends BaseCommand<typeof Cp> {
  static description = 'copy file from local to nostr-fs'

  static examples = [
    `$ nostr-fs cp /tmp/foo.txt /home/
    (copies /tmp/foo.txt into a nostr-fs file 'foo.txt' in the nostr-fs '/home/' directory)
    $ nostr-fs cp /tmp/foo.txt /tmp/bar.txt
    (copies /tmp/foo.txt into a nostr-fs file at '/tmp/bar.txt')
`,
  ]

  static args = [
        {name: 'from', description: 'local absolute path to source file to be copied', required: true},
        {name: 'to', description: 'nostr-fs destination where content of source file is to be copied', required: true}
    ]
  
  async run(): Promise<void> {
    if (this.norun) {
        this.exit(1);
    }

    const {args, flags} = await this.parse(Cp)
    let from = args.from;
    let to = args.to;

    let contents = fs.readFileSync(from, {encoding: 'base64'});

    if (to.endsWith('/')) { // copy-into-a-directory request. use filename from source
        to = to + from.split('/').pop()
    }

    let parentDir = to.split('/').slice(0, -1).join('/');
    let rawFile: NostrFile = {
        parent: parentDir === '' ? '/' : parentDir,
        name: to.split('/').pop(),
        dir: false,
        data: contents,
        createdAt: Math.floor (Date.now() / 1000)
    };

    let eventContent = JSON.stringify(rawFile);
    let encryptedContent = await nip04.encrypt(this.keys.sk, this.keys.pk, eventContent)

    let event: Event = {
      kind: 1,
      created_at: Math.floor (Date.now() / 1000),
      tags: [
        ["p", this.keys.pk],
        ["a", rawFile.parent]
      ],
      content: encryptedContent,
      pubkey: this.keys.pk
    }

    event.id = getEventHash(event)
    event.sig = signEvent(event, this.keys.sk)

    const relay = relayInit('wss://nostr-dev.wellorder.net/')
    relay.connect();
    let sub: Sub;

    let events: Event[] = [];

    relay.on('connect', () => {
        sub = relay.sub([
            {
              kinds: [ 1 ],
              authors: [ this.keys.pk ],
              since: 1671997770
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

            try {
                if(fileSystem.canCopy(to)) {
                    let pub = relay.publish(event)
                    pub.on('ok', () => {
                        console.log(`${relay.url} has accepted our event ${JSON.stringify(event)}`)
                        relay.close()
                    })
                    pub.on('seen', () => {
                        console.log(`we saw the event on ${relay.url}`)
                        relay.close()
                    })
                    pub.on('failed', (reason: any) => {
                        console.log(`failed to publish to ${relay.url}: ${reason}`)
                        console.log(JSON.stringify(event, null, 2))
                        relay.close()
                    })
                }
            } catch(err: any) {
                throw new CLIError(err);
            }
        })
    })
    relay.on('notice', (notice: any) => {
        console.log(`received notice from ${relay.url} ${notice}`)
    })
    
  }

}
