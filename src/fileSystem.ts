export type NostrFile = {
    parent: string
    name: string,
    dir: boolean,
    data: string,
    createdAt?: number,
    props?: {}
}

export default class NostrFileSystem {
    fs: Map<string, NostrFile>;

    constructor() {
        this.fs = new Map();
        this.fs.set('/', {parent: '', name: '', data: '', dir: true});
    }

    update(file: NostrFile): string {
        let parentPath;
        if (file.parent === '/') {
            parentPath = file.parent
        }
        else {
            parentPath = file.parent + '/';
        }

        if (this.fs.has(parentPath + file.name)) {
            throw new Error("file already exists");
        }

        // set up ancestor directories to run checks.
        // (note, these have to be calculated because
        // there is no concept of `mkdir` in nostr-fs 
        // (as of 12/25/22))
        const ancestors = parentPath.split('/')
        for(let i = 1; i < ancestors.length; i++) {
            let ancestor = ancestors.slice(0, i).join('/');
            if (ancestor !== '') {
                this.fs.set(ancestor, {parent: '', name: '', data: '', dir: true});
            }
        }

        this.fs.set(parentPath + file.name, file);
        return `${parentPath + file.name} valid`
    }

    canCopy(path: string): boolean {
        let parent = path.split('/').slice(0, -1).join('/');
        parent = parent === '' ? '/' : parent;
        
        if (this.fs.has(path)) {
            throw new Error(`${path} already exists`)
        }

        if (this.fs.has(parent) && !this.fs.get(parent)?.dir) {
            throw new Error(`Cannot copy file into non-directory parent: ${parent}`)
        }

        return true;
    }
}