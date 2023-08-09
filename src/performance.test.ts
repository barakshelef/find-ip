import { SubnetTree } from ".";

const _randomIp = (): string => {
    return ip.fromLong(Math.floor(Math.random() * Math.pow(2, 32)) + 1);
}

const _randomSubnet = (): ip.SubnetInfo => {
    const cidr = Math.floor(Math.random() * 32) + 1
    return ip.cidrSubnet(`${_randomIp()}/${cidr}`);
}

describe('Performance', () => {
    test('time', () => {
        const tree = new SubnetTree();
        const splits = [1, 10, 100, 1000, 10000, 100000, 1000000];

        let startTime = performance.now();

        const subnets = Array.from(Array(1000001).keys()).map(_ => _randomSubnet());
        const ips = Array.from(Array(10000).keys()).map(_ => _randomIp());

        console.log(`setup ${(performance.now() - startTime)} ms`);

        startTime = performance.now();
        subnets.forEach((subnet, i) => {
            tree.addSubnet(subnet, i.toString())
            if (splits.includes(i)) {
                console.log(`addSubnet ${i} ${(performance.now() - startTime) / (i * 0.9)} ms/call`);
                startTime = performance.now();
                ips.forEach((ip) => tree.match(ip))
                console.log(`match ${i} ${(performance.now() - startTime) / ips.length} ms/call`)
                startTime = performance.now();
            }
        })
    })
    test('memory', () => {
        const tree = new SubnetTree();
        const splits = [1, 10, 100, 1000, 10000, 100000, 1000000];

        const subnets = Array.from(Array(1000001).keys()).map(_ => _randomSubnet());

        const start = process.memoryUsage().heapUsed;

        subnets.forEach((subnet, i) => {
            tree.addSubnet(subnet, i.toString())
            if (splits.includes(i)) {
                const now = process.memoryUsage().heapUsed;
                console.log(`${i} ${(now - start) / i / 1024} kB/subnet`);
            }
        })
    })
    test('memory seperate trees', () => {
        const subnets = Array.from(Array(10000).keys()).map(_ => _randomSubnet());
        const trees = Array.from(Array(100).keys()).map(_ => new SubnetTree());

        const start = process.memoryUsage().heapUsed;
        for (let i = 0; i < trees.length; i++) {
            const tree = trees[i];

            subnets.forEach((subnet, i) => {
                tree.addSubnet(subnet, i.toString())
            })

            const now = process.memoryUsage().heapUsed;
            console.log(`${i} ${(now - start) / (i * 10000) / 1024} kB/subnet`);
        }
    })
})