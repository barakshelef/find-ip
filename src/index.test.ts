import * as ip from 'ip';
import { SubnetTree } from "."

describe('SubnetTree', () => {
    test.each([
        ["10.255.255.255", "10.0.0.0/8"],
        ["10.0.0.0", "10.0.0.0/8"],
        ["10.0.255.0", "10.0.0.0/8"],
        ["10.0.0.255", "10.0.0.0/8"],
        ["172.16.0.0", "172.16.0.0/12"],
        ["172.31.255.255", "172.16.0.0/12"],
        ["172.16.255.0", "172.16.0.0/12"],
        ["192.168.0.0", "192.168.0.0/16"],
        ["192.168.255.255", "192.168.0.0/16"],
        ["192.168.255.1", "192.168.0.0/16"],
        ["127.0.0.1", "127.0.0.0/8"],
        ["127.0.1.1", "127.0.0.0/8"],
        ["249.222.125.102", "249.222.125.102/32"],
    ])('match %s in %s', (address: string, subnet: string) => {
        const tree = new SubnetTree();
        tree.addSubnet(ip.cidrSubnet(subnet), "foo");

        expect(tree.match(address)).toEqual(["foo"])
    })

    test.each([
        ["9.255.255.255", "10.0.0.0/8"],
        ["11.0.0.0", "10.0.0.0/8"],
        ["172.15.255.255", "172.16.0.0/12"],
        ["172.32.0.0", "172.16.0.0/12"],
        ["192.169.0.0", "192.168.0.0/16"],
        ["192.167.255.255", "192.168.0.0/16"],
        ["128.0.0.1", "127.0.0.0/8"],
        ["128.0.1.1", "127.0.0.0/8"],
        ["249.222.125.103", "249.222.125.102/32"],
    ])('no match %s in %s', (address: string, subnet: string) => {
        const tree = new SubnetTree();
        tree.addSubnet(ip.cidrSubnet(subnet), "foo");

        expect(tree.match(address)).toHaveLength(0)
    })

    test('match multiple', () => {
        const tree = new SubnetTree();
        tree.addSubnet(ip.cidrSubnet("192.168.0.0/16"), "foo");
        tree.addSubnet(ip.cidrSubnet("192.168.1.0/24"), "bar");

        const ids = tree.match("192.168.1.1");

        expect(ids).toHaveLength(2);
        expect(ids).toEqual(expect.arrayContaining(["foo", "bar"]))
    })

    test('match one of multiple', () => {
        const tree = new SubnetTree();
        tree.addSubnet(ip.cidrSubnet("192.168.0.0/16"), "foo");
        tree.addSubnet(ip.cidrSubnet("192.168.1.0/24"), "bar");

        const ids = tree.match("192.168.2.1");

        expect(ids).toEqual(["foo"])
    })

    test('match duplicate subnet', () => {
        const tree = new SubnetTree();
        tree.addSubnet(ip.cidrSubnet("192.168.0.0/16"), "foo");
        tree.addSubnet(ip.cidrSubnet("192.168.0.0/16"), "bar");

        const ids = tree.match("192.168.1.1");

        expect(ids).toHaveLength(2);
        expect(ids).toEqual(expect.arrayContaining(["foo", "bar"]))
    })

    test('match duplicate subnet', () => {
        const tree = new SubnetTree();
        tree.addSubnet(ip.cidrSubnet("192.168.0.0/16"), "foo");
        tree.addSubnet(ip.cidrSubnet("192.168.0.0/16"), "foo");

        const ids = tree.match("192.168.1.1");

        expect(ids).toHaveLength(2);
        expect(ids).toEqual(expect.arrayContaining(["foo", "foo"]))
    })

    test('remove subnet', () => {
        const tree = new SubnetTree();
        tree.addSubnet(ip.cidrSubnet("192.168.0.0/16"), "foo");
        tree.removeSubnet(ip.cidrSubnet("192.168.0.0/16"), "foo");


        const ids = tree.match("192.168.1.1");

        expect(ids).toHaveLength(0);
    })

    test('remove non-existent subnet', () => {
        const tree = new SubnetTree();

        tree.removeSubnet(ip.cidrSubnet("192.168.0.0/16"), "foo");

        const ids = tree.match("192.168.1.1");

        expect(ids).toHaveLength(0);
    })

    test('remove single id', () => {
        const tree = new SubnetTree();
        tree.addSubnet(ip.cidrSubnet("192.168.0.0/16"), "foo");
        tree.addSubnet(ip.cidrSubnet("192.168.0.0/16"), "bar");
        tree.removeSubnet(ip.cidrSubnet("192.168.0.0/16"), "foo");


        const ids = tree.match("192.168.1.1");

        expect(ids).toHaveLength(1);
        expect(ids).toEqual(expect.arrayContaining(["bar"]))
    })

    test('remove parent id', () => {
        const tree = new SubnetTree();
        tree.addSubnet(ip.cidrSubnet("192.168.0.0/16"), "foo");
        tree.addSubnet(ip.cidrSubnet("192.168.0.0/24"), "bar");
        tree.removeSubnet(ip.cidrSubnet("192.168.0.0/16"), "foo");


        const ids = tree.match("192.168.0.1");

        expect(ids).toHaveLength(1);
        expect(ids).toEqual(expect.arrayContaining(["bar"]))
    })

    test('prune', () => {
        const tree = new SubnetTree();
        tree.addSubnet(ip.cidrSubnet("1.0.0.0/8"), "foo");
        tree.addSubnet(ip.cidrSubnet("1.1.0.0/16"), "bar");
        tree.addSubnet(ip.cidrSubnet("1.1.1.0/24"), "baz");
        tree.addSubnet(ip.cidrSubnet("1.1.1.1/32"), "gaz");
        tree.removeSubnet(ip.cidrSubnet("1.0.0.0/8"), "foo");
        tree.removeSubnet(ip.cidrSubnet("1.1.0.0/16"), "bar");
        tree.removeSubnet(ip.cidrSubnet("1.1.1.0/24"), "baz");
        tree.removeSubnet(ip.cidrSubnet("1.1.1.1/32"), "gaz");

        expect(tree.root.children).toEqual({})
        expect(tree.root.ids).toBeUndefined()
    })
})
