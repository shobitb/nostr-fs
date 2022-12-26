import {Command} from '@oclif/core'
import {CLIError} from '@oclif/errors'
import * as fs from 'fs-extra'
import * as path from 'path'
import {
  relayInit,
  Relay,
} from 'nostr-tools'

export type Keys<T extends typeof Command> = {
    pk: string,
    sk: string
}

export abstract class BaseCommand<T extends typeof Command> extends Command {
  protected keys!: Keys<T>;
  protected relay!: Relay;
  protected norun!: boolean;

  public async init(): Promise<void> {
    await super.init()
    
    try {
      let contents = fs.readFileSync(path.join(this.config.configDir, 'config.json'), { encoding: 'utf8' });
      try {
        this.keys = JSON.parse(contents);
      }
      catch (err: any) {
        this.norun = true;
        throw new CLIError(err);
      }
      
    } catch (err: any) {
      this.norun = true;
      if (err.code === 'ENOENT') {
        throw new CLIError('config.json does not exist. please initialize using `nostr-fs init`');
      }
      throw new CLIError(err);
    }

    // TODO: pull from config
    this.relay = relayInit('wss://nostr-dev.wellorder.net/')
  }

}