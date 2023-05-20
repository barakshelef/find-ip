import * as ip from 'ip';

export class SubnetTreeNode {
    public children: Record<number, SubnetTreeNode | undefined> = {};
    public ids?: string[];
    private constructor(public value: number | null, public size: number, public parent: SubnetTreeNode | null) { }

    public static createRoot(): SubnetTreeNode {
        return new SubnetTreeNode(null, 8, null);
    }

    public createChild(value: number): SubnetTreeNode {
        // size = -1 means unsized
        const child = new SubnetTreeNode(value, -1, this);
        this.children[value] = child;
        return child
    }

    public isPopulated(): boolean {
        return this.ids !== undefined || Object.keys(this.children).length > 0
    }

    public split(newSize: number) {
        if (newSize == this.size) return;

        const newChildren: typeof this.children = {};
        const newChildSize = this.size - newSize;
        Object.values(this.children).map((child) => {
            if (child === undefined || child.value === null) throw new Error('invalid child');
            // Split value to new child
            const newValue = child.value >> newChildSize
            const newChildValue = child.value % (1 << newChildSize);

            let newChild = newChildren[newValue];
            if (newChild === undefined) {
                newChild = new SubnetTreeNode(newValue, newChildSize, this);
                if (this.ids !== undefined) {
                    newChild.ids = this.ids.slice()
                }
                newChildren[newValue] = newChild;
            }

            // Update params to point to new child
            child.value = newChildValue;
            child.size = newChildSize;
            child.parent = newChild;

            // Child becomes grandchild
            newChild.children[newChildValue] = child
        })

        // Update params
        this.size = newSize;
        delete this.ids; // all ids were transfered to new children.
        this.children = newChildren;
    }

    public prune(): void {
        if (this.parent === null || this.value === null) return; // cannot prune root node

        if (this.isPopulated()) return; // cannot prune populated node

        delete this.parent.children[this.value];

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

    static ADDRESS_SIZE = 32; // TODO: update when moving to IPv6

    slice(address: bigint, start: number, size: number): number {
        return Number(address >> BigInt(SubnetTree.ADDRESS_SIZE - start - size)) % Math.pow(2, size);
    }

    *iterate(
        address: string,
        end: number = SubnetTree.ADDRESS_SIZE,
        store: boolean = false,
    ) {
        let node = this.root;
        let cursor = 0; // Starting from MSB and moving right
        const addressLong = BigInt(ip.toLong(address));

        while (cursor < end) {
            if (node.size == -1) { // no children in this node
                if (!store) throw new Error('Cannot find node');
                node.size = end - cursor;
            } else if (cursor + node.size > end) { // node too big
                if (!store) throw new Error('Cannot find node');
                node.split(end - cursor);
            }

            // Slice off node.size bits from cursor onwards
            let value = this.slice(addressLong, cursor, node.size);
            cursor += node.size;

            let nextNode = node.children[value];
            if (nextNode === undefined) { // node does not contain this child
                if (!store) throw new Error('Cannot find node');
                nextNode = node.createChild(value)
            }

            yield nextNode;

            node = nextNode;
        }
    }

    public addSubnet(subnet: ip.SubnetInfo, id: string) {
        const nodes = Array.from(this.iterate(subnet.networkAddress, subnet.subnetMaskLength, true));
        nodes[nodes.length - 1].addId(id);
    }

    public removeSubnet(subnet: ip.SubnetInfo, id: string) {
        try {
            // If subnet is in tree we should have an exact node for this subnet
            const nodes = Array.from(this.iterate(subnet.networkAddress, subnet.subnetMaskLength));
            nodes[nodes.length - 1].removeId(id)
            nodes[nodes.length - 1].prune();
        } catch { } // Couldn't find exact node -- nothing to remove.
    }

    public match(address: string): string[] {
        const ids: string[] = [];
        try {
            // Iterate on all relevant nodes and collect all ids
            for (const node of this.iterate(address)) {
                if (node.ids !== undefined) ids.push(...node.ids);
            }
        }
        catch { } // Couldn't find exact node -- return any ids we did encounter.
        return ids;
    }

}