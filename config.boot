firewall {
    global-options {
        all-ping "disable"
        resolver-cache
        state-policy {
            related {
                action "accept"
                log
                log-level "info"
            }
        }
        timeout {
            tcp {
                established "86400"
            }
        }
    }
    group {
        address-group email-product-server-group11 {
            address "1.1.1.11"
        }
        address-group email-product-server-group12 {
            address "1.1.1.12"
        }
        address-group email-product-server-group13 {
            address "1.1.1.13"
        }
        address-group email-product-server-group14 {
            address "1.1.1.14"
        }
        address-group email-product-server-group15 {
            address "1.1.1.15"
        }
        address-group email-product-server-group16 {
            address "1.1.1.16"
        }
        address-group group01 {
            address "1.1.1.1"
            include "testgroup100"
        }
        address-group group02 {
            address "1.1.1.2"
        }
        address-group group03 {
            address "1.1.1.3"
        }
        address-group group04 {
            address "1.1.1.4"
        }
        address-group group05 {
            address "1.1.1.5"
        }
        address-group group06 {
            address "1.1.1.6"
        }
        address-group group07 {
            address "1.1.1.7"
        }
        address-group internal-finance-department-server-group17 {
            address "1.1.1.17"
        }
        address-group internal-finance-department-server-group18 {
            address "1.1.1.18"
        }
        address-group internal-finance-department-server-group19 {
            address "1.1.1.19"
        }
        address-group internal-finance-department-server-group20 {
            address "1.1.1.20"
        }
        address-group testgroup1 {
            address "1.1.1.1-1.1.1.10"
        }
        address-group testgroup2 {
            address "5.6.7.8-5.6.7.9"
        }
        address-group testgroup3 {
            include "testgroup1"
            include "testgroup2"
        }
        address-group testgroup100 {
            address "9.8.7.6"
        }
        address-group web-server-group08 {
            address "1.1.1.8"
        }
        address-group web-server-group09 {
            address "1.1.1.9"
        }
        address-group web-server-group10 {
            address "1.1.1.10"
        }
        domain-group domaingp1 {
            address "baidu.com"
        }
        dynamic-group {
            address-group dyn-addrgrp1 {
                description "testing"
            }
            ipv6-address-group ipv6-dagp1 {
                description "testing2"
            }
        }
        interface-group intfgp1 {
            interface "eth1"
        }
        ipv6-address-group ipv6-agp1 {
            address "1:1:1:1:1:1:1:1"
        }
        ipv6-network-group v6-ngp1 {
            network "2:2:2:2:0:0:0:0/64"
        }
        mac-group mgp1 {
            mac-address "11:22:33:44:55:66"
        }
        network-group v4-ng1 {
            network "6.6.6.0/24"
        }
        port-group pg1 {
            port "5000"
            port "3000-4000"
        }
    }
    ipv4 {
        forward {
            filter {
                rule 1 {
                    action "accept"
                    description "my testing policy"
                    destination {
                        address "5.5.5.5"
                    }
                    inbound-interface {
                        name "eth1"
                    }
                    log
                    outbound-interface {
                        name "eth0"
                    }
                    protocol "tcp"
                    source {
                        group {
                            address-group "group01"
                        }
                    }
                    state "established"
                    state "new"
                    state "invalid"
                    state "related"
                    tcp {
                        flags {
                            ack
                            not {
                            }
                            syn
                        }
                    }
                    time {
                        startdate "2026-08-01"
                        starttime "10:58:20"
                        stopdate "2026-08-21"
                        stoptime "11:59:59"
                        weekdays "Friday"
                    }
                }
                rule 2 {
                    action "accept"
                    destination {
                        address "6.7.8.9"
                    }
                    inbound-interface {
                        name "eth1"
                    }
                    outbound-interface {
                        name "eth0"
                    }
                    protocol "all"
                    source {
                        group {
                            network-group "v4-ng1"
                        }
                    }
                }
                rule 3 {
                    action "accept"
                    destination {
                        address "50.1.1.0/24"
                        port "443"
                    }
                    inbound-interface {
                        name "eth2"
                    }
                    outbound-interface {
                        name "eth3"
                    }
                    protocol "udp"
                    source {
                        address "51.1.1.0/24"
                        port "1-65535"
                    }
                }
                rule 4 {
                    action "accept"
                    destination {
                        address "80.20.1.0/24"
                    }
                    inbound-interface {
                        name "eth2"
                    }
                    outbound-interface {
                        name "eth3"
                    }
                    protocol "all"
                    source {
                        address "80.10.1.0/24"
                    }
                }
            }
        }
    }
    ipv6 {
        forward {
            filter {
                rule 1 {
                    action "accept"
                    destination {
                        address "3ffe:1::1/64"
                        port "443"
                    }
                    inbound-interface {
                        name "eth1"
                    }
                    outbound-interface {
                        name "eth0"
                    }
                    protocol "tcp"
                    source {
                        address "2023:1::2/42"
                        port "100-50020"
                    }
                }
                rule 2 {
                    action "accept"
                    description "test2"
                    destination {
                        address "3ff0:2::0/48"
                    }
                    inbound-interface {
                        name "eth1"
                    }
                    outbound-interface {
                        name "eth2"
                    }
                    protocol "udp"
                    source {
                        address "2009:1:2:3::0/64"
                    }
                }
                rule 3 {
                    action "accept"
                    description "test3"
                    destination {
                        address "3ffe:90::1"
                    }
                    inbound-interface {
                        name "eth2"
                    }
                    log
                    log-options {
                        level "warn"
                    }
                    outbound-interface {
                        name "eth3"
                    }
                    protocol "all"
                    source {
                        address "3ffe:80::1"
                    }
                }
                rule 4 {
                    action "accept"
                    description "test4"
                    destination {
                        group {
                            domain-group "domaingp1"
                        }
                    }
                    inbound-interface {
                        name "eth2"
                    }
                    log
                    log-options {
                        level "emerg"
                    }
                    outbound-interface {
                        name "eth1"
                    }
                    protocol "all"
                    source {
                        group {
                            address-group "ipv6-agp1"
                        }
                    }
                }
            }
        }
    }
}
high-availability {
    virtual-server vs01 {
        address "1.1.1.1"
        port "230"
        real-server rs01 {
            connection-timeout "2"
            port "23"
        }
    }
    vrrp {
        group vg01 {
            address 192.168.61.11 {
                interface "eth1"
            }
            interface "eth1"
            peer-address "192.168.61.23"
            vrid "23"
        }
        group vg02 {
            address 59.10.1.1/24 {
            }
            address 59.10.2.1/24 {
            }
            authentication {
                password "123456"
                type "plaintext-password"
            }
            description "test02"
            interface "eth3"
            vrid "2"
        }
        sync-group syncgroup01 {
            member "vg01"
            member "vg02"
        }
    }
}
interfaces {
    bridge br10 {
        description "test"
        member {
            interface eth1.10 {
            }
            interface eth1.24 {
            }
            interface eth3 {
            }
        }
    }
    bridge br11 {
        address "50.7.8.57/24"
        description "test11"
    }
    dummy dum0 {
        address "211.11.23.1/24"
        description "test0"
    }
    ethernet eth0 {
        address "192.168.5.200/24"
        description "INSIDE"
        hw-id "00:0c:29:0e:3e:52"
        offload {
            gro
            gso
            sg
            tso
        }
    }
    ethernet eth1 {
        address "192.168.60.1/24"
        address "2002:1:2:3::1/64"
        address "192.168.70.1/24"
        address "2036:1:2:3::1/64"
        evpn {
            uplink
        }
        hw-id "00:0c:29:0e:3e:5c"
        ipv6 {
        }
        offload {
            gro
            gso
            sg
            tso
        }
        vif 10 {
            description "test010"
        }
        vif 24 {
            description "test2"
            dhcp-options {
                host-name "easynet.com"
            }
        }
        vif 25 {
            address "dhcp"
            address "dhcpv6"
        }
        vif-s 30 {
            vif-c 62 {
            }
            vif-c 63 {
                address "192.1.30.63/16"
            }
        }
    }
    ethernet eth2 {
        disable
        hw-id "00:0c:29:0e:3e:3e"
    }
    ethernet eth3 {
        disable
        hw-id "00:0c:29:0e:3e:48"
    }
    loopback lo {
    }
    tunnel tun1 {
        encapsulation "ipip6"
        remote "2036:1:2:3::2"
        source-address "2036:1:2:3::1"
    }
    virtual-ethernet veth0 {
        address "3.9.5.11/24"
        peer-name "veth1"
    }
    virtual-ethernet veth1 {
        peer-name "veth0"
    }
    virtual-ethernet veth100 {
        peer-name "veth101"
    }
    virtual-ethernet veth101 {
        peer-name "veth100"
    }
    vti vti0 {
        address "55.7.8.3/24"
        description "test0"
    }
    vti vti1 {
        address "11.7.9.3/24"
        description "test1"
    }
}
nat {
    cgnat {
        pool {
            external e01 {
                external-port-range "200-230"
                per-user-limit {
                    port "3"
                }
                range 3.3.1.2-3.3.1.50 {
                    seq "1"
                }
                range 3.3.5.2-3.3.5.50 {
                    seq "2"
                }
            }
            internal in01 {
                range "5.2.1.2-5.2.1.30"
            }
        }
        rule 1 {
            source {
                pool "in01"
            }
            translation {
                pool "e01"
            }
        }
    }
    destination {
        rule 1 {
            destination {
                group {
                    mac-group "mgp1"
                    network-group "v4-ng1"
                    port-group "pg1"
                }
                port "100-900"
            }
            inbound-interface {
                name "eth1"
            }
            packet-type "other"
            protocol "tcp"
            source {
                address "5.1.2.1"
            }
            translation {
                address "5.6.1.2-5.6.1.9"
                options {
                    address-mapping "persistent"
                    port-mapping "random"
                }
                port "3000-9000"
            }
        }
    }
    source {
        rule 1 {
            destination {
                address "3.1.1.9"
                group {
                    mac-group "mgp1"
                    port-group "pg1"
                }
                port "2000-2300"
            }
            outbound-interface {
                name "eth1"
            }
            packet-type "other"
            protocol "tcp"
            source {
                address "9.9.1.1"
            }
            translation {
                address "192.168.5.200"
                options {
                    address-mapping "random"
                    port-mapping "random"
                }
                port "300-6000"
            }
        }
        rule 2 {
            description "test2"
            destination {
                address "192.16.10.9"
            }
            outbound-interface {
                name "eth2"
            }
            packet-type "other"
            source {
                group {
                    address-group "group01"
                }
            }
            translation {
                address "19.18.1.10"
                options {
                    port-mapping "random"
                }
            }
        }
    }
    static {
        rule s01 {
            destination {
                address "2.1.1.1"
            }
            inbound-interface "eth1"
            translation {
                address "3.1.1.1"
            }
        }
    }
}
netns {
    name ns01 {
        description "working"
    }
    name ns02 {
        description "management"
    }
    name ns03 {
        description "testns3"
    }
    name ns04 {
        description "test04"
    }
}
pki {
    x509 {
        default {
            country "CN"
            locality "Beijing"
            organization "Easynetworks"
            state "Haidian"
        }
    }
}
policy {
    access-list 1 {
        description "standard-01"
        rule 1 {
            action "permit"
            description "test-aaccesslist"
            destination {
                network "7.7.7.7"
            }
            source {
                any
                host "6.6.6.6"
            }
        }
    }
    access-list 102 {
    }
    as-path-list aspath01 {
        description "test-aspath"
        rule 1 {
            action "permit"
            regex "64505 64507"
        }
    }
    community-list com01 {
        description "commlist-test"
        rule 1 {
            action "deny"
            regex "additive"
        }
    }
    extcommunity-list extcomm01 {
        description "ext-comm-01"
        rule 1 {
            action "permit"
            regex "20:11:80"
        }
    }
    large-community-list large01 {
        description "large-comm-test"
        rule 1 {
            action "permit"
            regex "121:55:76"
        }
    }
    local-route {
        rule 1 {
            destination {
                address "6.7.8.0/24"
                port "564"
            }
            set {
                table "main"
            }
            source {
                address "59.1.1.1"
            }
        }
    }
    local-route6 {
        rule 1 {
            destination {
                address "2089:1:1:1::0/64"
            }
            fwmark "2345121"
            inbound-interface "eth1"
            protocol "tcp"
            set {
                table "main"
            }
            source {
                address "2000::0/8"
            }
        }
    }
    prefix-list prefix01 {
        description "prefix-0001"
        rule 1 {
            action "permit"
            prefix "91.1.0.0/16"
        }
    }
    prefix-list6 prefix6 {
        description "prefix6-test"
        rule 1 {
            action "permit"
            prefix "2099::0/48"
        }
    }
    route pr01 {
        description "policy-route-test01"
        interface "eth1"
        rule 1 {
            action "accept"
            destination {
                address "9.9.9.10"
            }
            icmp {
                code "3"
                type "2"
            }
            protocol "icmp"
            set {
                table "main"
            }
            source {
                address "5.5.6.0/24"
            }
        }
    }
    route-map rm01 {
        description "routemap-test"
        rule 1 {
            action "permit"
            match {
                ip {
                    address {
                        access-list "100"
                    }
                }
            }
        }
    }
    route6 pr06 {
        description "test-prv6"
        rule 1 {
            action "accept"
            description "rule-1"
            destination {
                group {
                    network-group "v6-ngp1"
                }
            }
            protocol "tcp"
            set {
                connection-mark "233"
            }
            source {
                port "20000-20099"
            }
            tcp {
                flags {
                    ack
                    urg
                }
            }
        }
    }
}
protocols {
    babel {
        interface eth1 {
            hello-interval "5000"
            type "wired"
        }
    }
    bfd {
        peer 5.4.1.1 {
            passive
        }
        profile bfd01 {
            passive
        }
    }
    bgp {
        address-family {
            ipv4-unicast {
                network 2.2.2.0/24 {
                }
            }
        }
        interface eth1 {
        }
        neighbor 192.168.61.3 {
            address-family {
                ipv4-unicast {
                }
            }
            local-as 100 {
            }
            local-role rs-server {
            }
            remote-as "500"
        }
        parameters {
            router-id "2.2.2.2"
        }
        system-as "300"
    }
    failover {
        route 20.1.1.0/24 {
            next-hop 192.168.6.2 {
                check {
                    target 192.168.7.1 {
                    }
                }
                interface "eth1"
                metric "25"
            }
        }
    }
    igmp-proxy {
        interface eth1 {
            alt-subnet "3.3.3.0/24"
            threshold "56"
            whitelist "2.2.2.0/24"
        }
        interface eth1.10 {
            role "upstream"
        }
    }
    ospf {
        access-list 1 {
            export "kernel"
        }
        aggregation {
            timer "200"
        }
        area 0.0.0.0 {
            area-type {
                normal
            }
            network "192.168.70.0/24"
        }
        default-information {
            originate {
                metric "234"
            }
        }
        neighbor 192.168.61.2 {
            priority "20"
        }
        parameters {
            router-id "1.1.1.1"
        }
        redistribute {
            connected {
                metric-type "2"
            }
        }
    }
    ospfv3 {
        area 0.0.0.0 {
        }
        parameters {
            router-id "3.3.3.3"
        }
    }
    pim6 {
    }
    static {
        arp {
            interface eth1 {
                address 29.1.1.12 {
                    description "testserver1"
                    mac "00:11:22:33:44:55"
                }
            }
        }
        route 0.0.0.0/0 {
            next-hop 192.168.5.1 {
                interface "eth0"
            }
        }
        route 39.1.0.0/16 {
            reject {
                distance "20"
            }
        }
        route 39.2.0.0/24 {
            interface eth1 {
                distance "15"
            }
        }
        route 39.3.1.0/24 {
            next-hop 192.168.5.1 {
                vrf "default"
            }
        }
        route 192.168.1.0/24 {
            next-hop 192.168.5.1 {
                interface "eth0"
            }
        }
        route 192.168.123.0/24 {
            blackhole {
                tag "123"
            }
        }
        route6 2029:1:1:1::0/64 {
            next-hop 2002:1:2:3::12 {
                interface "eth1"
            }
        }
        route6 2029:2:2:2::0/64 {
            reject {
                distance "10"
                tag "1010"
            }
        }
        route6 2029:2:2:3::0/64 {
            interface eth1 {
            }
        }
        route6 2029:2:2:4::0/64 {
            blackhole {
                distance "50"
            }
            description "blackhole-route"
        }
        table 20 {
            description "routetable-20"
            route 7.7.1.0/24 {
                next-hop 192.168.61.7 {
                    interface "eth1"
                }
            }
            route6 2007:1:1:1::0/64 {
                next-hop 2029:2:2:3::7 {
                }
            }
        }
    }
}
qos {
    interface eth1 {
        egress "c01"
        ingress "limit01"
    }
    policy {
        cake c01 {
            bandwidth "23mbit"
            rtt "210"
        }
        cake c02 {
            bandwidth "90"
            flow-isolation "flow"
        }
        drop-tail d01 {
            queue-limit "300200"
        }
        drop-tail d02 {
            description "droptail02"
            queue-limit "4096000"
        }
        fair-queue fq01 {
            hash-interval "20"
            queue-limit "89"
        }
        fq-codel fqc01 {
            codel-quantum "3211"
            flows "5400"
            interval "50090020"
            queue-limit "10500"
            target "3002"
        }
        fq-codel fqc02 {
            codel-quantum "1518"
            flows "6120"
            interval "300"
            queue-limit "10200"
            target "400"
        }
        limiter limit01 {
            class 23 {
                bandwidth "100mbit"
                burst "110m"
                exceed "drop"
                match cr01 {
                    ip {
                        destination {
                            address "3.1.1.7"
                            port "5600"
                        }
                        dscp "AF12"
                        max-length "3000"
                        protocol "tcp"
                        source {
                            address "3.6.9.125"
                        }
                        tcp {
                            syn
                        }
                    }
                }
                mtu "1400"
                priority "2"
            }
            default {
                bandwidth "30mbit"
            }
        }
        limiter limit02 {
            class 1 {
                bandwidth "100gbit"
                burst "110gb"
                exceed "ok"
                match rulen02 {
                    mark "200"
                    vif "29"
                }
                mtu "1500"
                priority "12"
            }
            default {
                bandwidth "200gbit"
            }
        }
        network-emulator em01 {
            bandwidth "100kbit"
            corruption "30"
            delay "20"
            duplicate "10"
            loss "5"
            queue-limit "3000200"
            reordering "3"
        }
        priority-queue pq01 {
            class 1 {
                codel-quantum "20010"
                flows "3001"
                interval "200"
                match m01 {
                    ip {
                        destination {
                            address "5.1.0.2"
                            port "23"
                        }
                    }
                }
            }
            default {
                interval "200"
                queue-limit "300900"
                target "20"
            }
        }
        random-detect rand01 {
            bandwidth "100mbit"
            precedence 0 {
                average-packet "1024"
                mark-probability "20"
                maximum-threshold "2048"
                minimum-threshold "120"
                queue-limit "20480"
            }
        }
        rate-control rc01 {
            bandwidth "200kbit"
            burst "500kb"
            latency "10"
        }
        round-robin rr01 {
            class 1 {
                codel-quantum "2000"
                flows "2000"
                interval "300"
                quantum "3900200"
                queue-limit "90030010"
                queue-type "drop-tail"
                target "10"
            }
        }
        shaper shaper01 {
            bandwidth "120mbit"
            class 3 {
                bandwidth "10kbit"
                burst "90mb"
                match rule01 {
                    ipv6 {
                        destination {
                            address "2079:1:1:23::0/64"
                            port "23"
                        }
                        protocol "tcp"
                        source {
                            address "2019:1:2:34::0/64"
                        }
                    }
                }
            }
            default {
                bandwidth "54mbit"
            }
        }
    }
    traffic-match-group matchgp01 {
        match rule01 {
            ip {
                destination {
                    address "5.1.1.0/24"
                    port "23"
                }
                protocol "tcp"
                source {
                    address "6.1.1.1"
                }
                tcp {
                    syn
                }
            }
        }
    }
}
service {
    dhcp-server {
        listen-interface "eth1"
        shared-network-name lan01 {
            subnet 192.168.70.0/24 {
                exclude "192.168.70.100"
                lease "42949672"
                range rang01 {
                    start "192.168.70.2"
                    stop "192.168.70.200"
                }
                static-mapping static01 {
                    ip-address "192.168.70.201"
                    mac "11:22:33:44:55:66"
                }
                subnet-id "1"
            }
        }
    }
    dhcpv6-server {
        global-parameters {
            name-server "1:2:3:4::5"
            name-server "5:6:7:8::9"
        }
        listen-interface "eth1"
        listen-interface "eth1.10"
        preference "30"
        shared-network-name sharednet01 {
            description "my dhcpv6 test"
            interface "eth1"
            option {
                domain-search "8.8.8.8"
                domain-search "4.4.4.4"
                domain-search "aliyun.com"
                info-refresh-time "2345657"
                name-server "9:0:0:1::2"
            }
            subnet 2036:1:2:3::0/64 {
                interface "eth1"
                lease-time {
                    default "345436547"
                }
                option {
                    name-server "1:2:3:4:5:6:7:8"
                    name-server "1:2:3:4:5:6:7:9"
                    name-server "1:2:3:4:5:6:7:6"
                    nis-server "9:8:7:6::3"
                    nis-server "9:8:7:6::4"
                    nis-server "9:8:7:6::5"
                    nis-server "9:8:7:6::6"
                    sip-server "3:4:5:6::7"
                    sip-server "3:4:5:6::8"
                    sip-server "3:4:5:6::9"
                    sip-server "sip.easynetworks.com"
                    vendor-option {
                        cisco {
                            tftp-server "3:3:3::3"
                            tftp-server "3:3:3::5"
                        }
                    }
                }
                range rang02 {
                    option {
                        name-server "1:2::3"
                        name-server "1:2::4"
                        vendor-option {
                            cisco {
                                tftp-server "7:6:5::1"
                                tftp-server "7:6:5::2"
                            }
                        }
                    }
                    prefix "2036:1:2:3:2::0/80"
                }
                subnet-id "1"
            }
        }
    }
    dns {
        dynamic {
            name dyn02 {
                address {
                    web {
                        url "https://www.123.com"
                    }
                }
                expiry-time "3000"
                host-name "easynetworks"
                password "123passwd"
                protocol "googledomains"
                server "77.1.1.1"
                username "dnstest02"
            }
        }
        forwarding {
            allow-from "2.2.2.0/24"
            authoritative-domain easynetworks.com.cn {
            }
            dhcp "eth1"
            domain www.easynetworks.com.cn {
                name-server 5.4.3.6 {
                    port "56"
                }
            }
            exclude-throttle-address "2.2.2.2"
            listen-address "3.3.3.3"
            name-server 4.4.4.4 {
            }
            name-server 7.7.7.7 {
            }
            name-server 8.8.8.8 {
            }
            options {
                ecs-add-for "6.6.6.0/24"
            }
            source-address "192.168.60.1"
            timeout "2345"
        }
    }
    https {
        allow-client {
            address "192.168.5.0/24"
            address "192.168.5.191"
        }
        api {
            graphql {
                authentication {
                    type "key"
                }
                cors {
                    allow-origin "192.168.5.0/24"
                    allow-origin "www.baidu.com"
                }
            }
            keys {
                id test {
                    key "1234567890"
                }
                id test02 {
                    key "9876543210"
                }
            }
            rest {
            }
        }
        port "443"
    }
    ntp {
        allow-client {
            address "127.0.0.0/8"
            address "169.254.0.0/16"
            address "10.0.0.0/8"
            address "172.16.0.0/12"
            address "192.168.0.0/16"
            address "::1/128"
            address "fe80::/10"
            address "fc00::/7"
        }
        server time1.vyos.net {
        }
        server time2.vyos.net {
        }
        server time3.vyos.net {
        }
    }
    snmp {
        community public {
            authorization "rw"
            client "192.168.5.71"
            network "192.168.5.0/24"
        }
        contact "easynetworks.com"
        location "beijing"
    }
    ssh {
        access-control {
            allow {
                user "vyos"
            }
            deny {
                group "usergroup1"
                user "user01"
            }
        }
        dynamic-protection {
            allow-from "192.168.5.0/24"
        }
    }
    suricata {
        address-group agroup03 {
            address "2.3.4.0/24"
        }
        interface "eth1"
        log {
            eve {
                type "http"
            }
        }
        port-group portgp01 {
            port "2-2048"
        }
        port-group portgp02 {
            port "1024-4096"
        }
        port-group portgp03 {
            port "5060"
        }
    }
}
system {
    config-management {
        commit-revisions "100"
    }
    conntrack {
        expect-table-size "4096"
        hash-size "65536"
        table-size "268491"
        tcp {
            max-retrans "6"
        }
        timeout {
            custom {
                ipv4 {
                    rule 1 {
                        destination {
                            address "2.1.0.1"
                            port "1000-1320"
                        }
                        protocol {
                            tcp {
                                last-ack "120"
                            }
                        }
                        source {
                            address "3.1.1.1"
                            port "3000-3200"
                        }
                    }
                }
                ipv6 {
                    rule 1 {
                        destination {
                            address "2059::1"
                            port "235"
                        }
                        protocol {
                            udp {
                                replied "2000"
                                unreplied "200"
                            }
                        }
                        source {
                            address "2079::1"
                            port "809"
                        }
                    }
                }
            }
        }
    }
    console {
        device ttyS0 {
            speed "115200"
        }
    }
    host-name "vyos"
    login {
        user vyos {
            authentication {
                encrypted-password "$6$rounds=656000$cWHiRtqG3EUM7.yu$nnV/4YLuSFG40Kdza2kBx3pSV1XLQzn34jmKIcv1YBQ0a05rWfWyE5UYD7aAbAZeTJuUj5sMO.ioFmODvfUkx."
                plaintext-password ""
            }
        }
    }
    name-server "202.106.46.151"
    name-server "202.106.195.68"
    name-server "8.8.8.8"
    syslog {
        local {
            facility all {
                level "info"
            }
            facility local7 {
                level "debug"
            }
        }
    }
}
vpn {
    ipsec {
        authentication {
            psk psk01 {
                id "123456"
                secret "mypassword"
            }
            psk psk02 {
                id "1"
                secret "password02"
            }
            psk psk03 {
                id "beijing-hq"
                secret "12345678"
                secret-type "plaintext"
            }
        }
        esp-group espgp1 {
            life-bytes "6843545600000"
            life-packets "268435456000"
            lifetime "86400"
            mode "tunnel"
            pfs "dh-group20"
            proposal 1 {
                encryption "aes256ccm96"
                hash "sha256_96"
            }
            proposal 2 {
                encryption "aes256gcm128"
                hash "aesxcbc"
            }
        }
        esp-group espgp3 {
            mode "tunnel"
            pfs "disable"
            proposal 1 {
                encryption "aes256ccm96"
                hash "sha384"
            }
        }
        esp-group espgroup2 {
            mode "tunnel"
            pfs "dh-group25"
            proposal 1 {
                encryption "aes128"
                hash "aes256gmac"
            }
        }
        ike-group ikegrp1 {
            close-action "trap"
            dead-peer-detection {
                action "restart"
                interval "36"
                timeout "128"
            }
            key-exchange "ikev2"
            lifetime "86400"
            proposal 1 {
                dh-group "20"
                encryption "blowfish128"
                hash "sha512"
                prf "prfsha512"
            }
            proposal 2 {
                dh-group "24"
                encryption "aes256"
                hash "sha512"
                prf "prfsha384"
            }
        }
        ike-group ikegrp2 {
            dead-peer-detection {
                interval "50"
                timeout "160"
            }
            ikev2-reauth
            key-exchange "ikev2"
            mode "aggressive"
            proposal 1 {
                dh-group "19"
                encryption "aes256"
                hash "sha384"
                prf "prfsha256"
            }
            proposal 2 {
                dh-group "25"
                encryption "aes256"
                hash "sha512"
                prf "prfaesxcbc"
            }
        }
        ike-group ikegrp3 {
            close-action "none"
            key-exchange "ikev1"
            lifetime "28800"
            mode "main"
            proposal 1 {
                dh-group "22"
                encryption "aes128ccm128"
                hash "aes128gmac"
                prf "prfsha256"
            }
        }
        interface "eth2"
        interface "eth3"
        log {
            level "1"
            subsystem "ike"
            subsystem "dmn"
            subsystem "esp"
        }
        options {
            retransmission {
                attempts "10"
            }
        }
        profile pf01 {
            authentication {
                mode "pre-shared-secret"
            }
            esp-group "espgp1"
            ike-group "ikegrp1"
        }
        site-to-site {
            peer hq1 {
                authentication {
                    mode "pre-shared-secret"
                }
                default-esp-group "espgp1"
                ike-group "ikegrp1"
                local-address "192.168.70.1"
                remote-address "192.168.70.12"
                tunnel 1 {
                    esp-group "espgp1"
                    local {
                        prefix "18.1.1.0/24"
                    }
                    remote {
                        prefix "17.1.1.0/24"
                    }
                }
            }
            peer hq3 {
                authentication {
                    mode "pre-shared-secret"
                }
                default-esp-group "espgp3"
                description "test3"
                ike-group "ikegrp3"
                local-address "192.168.60.1"
                remote-address "192.168.60.60"
                tunnel 1 {
                    esp-group "espgp3"
                    local {
                        prefix "29.10.1.0/24"
                    }
                    protocol "tcp"
                    remote {
                        prefix "30.10.1.0/24"
                    }
                }
            }
        }
    }
    l2tp {
        remote-access {
            authentication {
                local-users {
                    username l2tpuser01 {
                        password "1234567890"
                    }
                }
                mode "local"
            }
            client-ip-pool l2tppool01 {
                range "2.3.4.5-2.3.4.50"
            }
            client-ipv6-pool l2tpv6pool01 {
                prefix 1122:3344:5566:7788::0/64 {
                }
            }
            default-ipv6-pool "l2tpv6pool01"
            default-pool "l2tppool01"
            gateway-address "192.168.60.1"
            ipsec-settings {
                authentication {
                    mode "pre-shared-secret"
                    pre-shared-secret "12345678901"
                }
            }
            lns {
                host-name "testlns.com"
                shared-secret "9876543210"
            }
            outside-address "192.168.60.1"
        }
    }
    pptp {
        remote-access {
            authentication {
                local-users {
                    username user01 {
                        password "12345678"
                    }
                }
            }
            client-ip-pool cip01 {
                range "8.8.8.0/24"
            }
            client-ipv6-pool cipv601 {
                prefix 1:2:3:4:5:0:0:0/80 {
                }
            }
            default-ipv6-pool "cipv601"
            default-pool "cip01"
            gateway-address "192.168.60.1"
            ppp-options {
                ipv4 "allow"
            }
        }
    }
}
vrf {
    name vrf01 {
        description "vrf-test01"
        table "501"
    }
    name vrf02 {
        description "vrf-test02"
        table "502"
    }
}


// Warning: Do not remove the following line.
// vyos-config-version: "bgp@6:broadcast-relay@1:cluster@2:config-management@1:conntrack@6:conntrack-sync@2:container@3:dhcp-relay@2:dhcp-server@11:dhcpv6-server@6:dns-dynamic@4:dns-forwarding@4:firewall@20:flow-accounting@3:https@7:ids@2:interfaces@34:ipoe-server@4:ipsec@14:isis@3:l2tp@9:lldp@3:mdns@1:monitoring@2:nat@8:nat66@3:nhrp@1:ntp@3:openconnect@3:openvpn@5:ospf@2:pim@1:policy@9:pppoe-server@12:pptp@5:qos@3:quagga@12:reverse-proxy@3:rip@1:rpki@2:salt@1:snmp@3:ssh@3:sstp@6:system@31:vpp@5:vrf@4:vrrp@4:vyos-accel-ppp@2:wanloadbalance@4:webproxy@2"
// Release version: 2026.02.03-0027-rolling
