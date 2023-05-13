import * as IpAddress from 'ip-address';

export type Bit = '0' | '1'

export class SubnetTreeNode {
    private 0?: SubnetTreeNode;
    private 1?: SubnetTreeNode;
    public ids?: string[];
    private constructor(public value: Bit | null, public parent: SubnetTreeNode | null) { }

    public static createRoot(): SubnetTreeNode {
        return new SubnetTreeNode(null, null);
    }

    public createChild(value: Bit): SubnetTreeNode {
        const child = new SubnetTreeNode(value, this);
        this[value] = child;
        return child
    }

    public isPopulated(): boolean {
        return this.ids !== undefined || this[0] !== undefined || this[1] !== undefined
    }

    public prune(): void {
        if (this.parent === null || this.value === null) return; // cannot prune root node

        if (this.isPopulated()) return; // cannot prune populated node

        delete this.parent[this.value];

        this.parent.prune();
    }

    public addId(id: string): void {
        if (this.ids === undefined) this.ids = [];
        this.ids.push(id);
    }

    public removeId(id: string): void {
        if (this.ids === undefined) return;
        this.ids = this.ids.filter((nid) => nid != id);
        if (this.ids.length === 0) delete this.ids;
    }
}

export class SubnetTree {
    constructor(public root: SubnetTreeNode = SubnetTreeNode.createRoot()) { }

    public addSubnet(subnet: IpAddress.Address4, id: string) {
        let node = this.root;
        for (const bit of subnet.mask()) {
            let nextNode = node[bit as Bit];

            if (nextNode === undefined) {
                nextNode = node.createChild(bit as Bit);
            }

            node = nextNode;
        }
        node.addId(id)
    }

    public removeSubnet(subnet: IpAddress.Address4, id: string) {
        let node = this.root;
        for (const bit of subnet.mask()) {
            let nextNode = node[bit as Bit];

            if (nextNode === undefined) {
                return // Subnet not in tree
            }

            node = nextNode;
        }
        node.removeId(id)
        node.prune();
    }

    public match(address: IpAddress.Address4): string[] {
        const ids: string[] = [];
        let node = this.root;
        for (const bit of address.binaryZeroPad()) {
            let nextNode = node[bit as Bit];

            if (nextNode === undefined) {
                break; // No more specific subnet describes the address
            }

            node = nextNode;

            // Collect any ids in current node
            if (node.ids !== undefined) {
                ids.push(...node.ids)
            }
        }
        return ids;
    }

}