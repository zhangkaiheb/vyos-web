vyos@vyos# set vrf name vrf03 protocols bgp parameters
Possible completions:
   allow-martian-nexthop
                        Allow Martian nexthops to be received in the NLRI from a peer
   always-compare-med   Always compare MEDs from different neighbors
 > bestpath             Default bestpath selection mechanism
   cluster-id           Route-reflector cluster-id
 > conditional-advertisement
                        Conditional advertisement settings
 > confederation        AS confederation parameters
 > dampening            Enable route-flap dampening
 > default              BGP defaults
   deterministic-med    Compare MEDs between different peers in the same AS
   disable-ebgp-connected-route-check
                        Disable checking if nexthop is connected on eBGP session
 > distance             Administratives distances for BGP routes
   ebgp-requires-policy Require in and out policy for eBGP peers (RFC8212)
   fast-convergence     Teardown sessions immediately whenever peer becomes unreachable
 > graceful-restart     Graceful restart capability parameters
   graceful-shutdown    Graceful shutdown
   labeled-unicast      BGP Labeled-unicast options
   log-neighbor-changes Log neighbor up/down changes and reset reason
   minimum-holdtime     BGP minimum holdtime
   network-import-check Enable IGP route check for network statements
   no-client-to-client-reflection
                        Disable client to client route reflection
   no-fast-external-failover
                        Disable immediate session reset on peer link down event
   no-hard-administrative-reset
                        Do not send hard reset CEASE Notification for 'Administrative
                        Reset'
   no-ipv6-auto-ra      Disable IPv6 automatic router advertisement
   no-suppress-duplicates
                        Disable suppress duplicate updates if the route actually not
                        changed
   reject-as-sets       Reject routes with AS_SET or AS_CONFED_SET flag
   route-reflector-allow-outbound-policy
                        Route reflector client allow policy outbound
   router-id            Override default router identifier
   shutdown             Administrative shutdown of the BGP instance
   suppress-fib-pending Advertise only routes that are programmed in kernel to peers
 > tcp-keepalive        TCP keepalive parameters


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters allow-martian-nexthop
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters always-compare-med
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters bestpath
Possible completions:
 > as-path              AS-path attribute comparison parameters
   bandwidth            Link Bandwidth attribute
   compare-routerid     Compare the router-id for identical EBGP paths
+  med                  MED attribute comparison parameters
 > peer-type            Peer type


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters bestpath as-path
Possible completions:
   confed               Compare AS-path lengths including confederation sets and
                        sequences
   ignore               Ignore AS-path length in selecting a route
   multipath-relax      Allow load sharing across routes that have different AS paths
                        (but same length)


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters bestpath as-path confed
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters bestpath as-path ignore
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters bestpath as-path multipath-relax
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters bestpath as-path multipath-relax
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters cluster-id
Possible completions:
   <x.x.x.x>            Route-reflector cluster-id



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters conditional-advertisement
Possible completions:
   timer                Set period to rescan BGP table to check if condition is met
                        (default: 60)


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters conditional-advertisement timer
Possible completions:
   <5-240>              Period to rerun the conditional advertisement scanner process



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters confederation
Possible completions:
   identifier           Confederation AS identifier
+  peers                Peer ASs in the BGP confederation


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters confederation identifier
Possible completions:
   <1-4294967294>       Confederation AS id



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters confederation peers
Possible completions:
   <1-4294967294>       Peer AS number



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters confederation peers 1
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters dampening
Possible completions:
   half-life            Half-life time for dampening
   max-suppress-time    Maximum duration to suppress a stable route
   re-use               Threshold to start reusing a route
   start-suppress-time  When to start suppressing a route


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters dampening half-life
Possible completions:
   <1-45>               Half-life penalty in minutes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters dampening max-suppress-time
Possible completions:
   <1-255>              Maximum suppress duration in minutes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters dampening re-use
Possible completions:
   <1-20000>            Re-use penalty points



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters dampening start-suppress-time
Possible completions:
   <1-20000>            Start-suppress penalty points



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters default
Possible completions:
   local-pref           Default local preference


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters default local-pref
Possible completions:
   <0-4294967295>       Local preference



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters deterministic-med
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters disable-ebgp-connected-route-check
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters distance
Possible completions:
 > global               Global administratives distances for BGP routes
+> prefix               Administrative distance for a specific BGP prefix


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters distance global
Possible completions:
   external             Administrative distance for external BGP routes
   internal             Administrative distance for internal BGP routes
   local                Administrative distance for local BGP routes


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters distance global external
Possible completions:
   <1-255>              Administrative distance for external BGP routes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters distance global internal
Possible completions:
   <1-255>              Administrative distance for internal BGP routes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters distance global local
Possible completions:
   <1-255>              Administrative distance for internal BGP routes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters ebgp-requires-policy
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters fast-convergence
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters graceful-restart
Possible completions:
   stalepath-time       Maximum time to hold onto restarting neighbors stale paths


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters graceful-restart stalepath-time
Possible completions:
   <1-3600>             Hold time in seconds



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters graceful-shutdown
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters labeled-unicast
Possible completions:
   explicit-null        Use explicit-null label values for all local prefixes
   ipv4-explicit-null   Use IPv4 explicit-null label value for IPv4 local prefixes
   ipv6-explicit-null   Use IPv6 explicit-null label value for IPv4 local prefixes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters labeled-unicast explicit-null
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters labeled-unicast ipv4-explicit-null
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters labeled-unicast ipv6-explicit-null
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters log-neighbor-changes
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters minimum-holdtime
Possible completions:
   <1-65535>            Minimum holdtime in seconds



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters network-import-check
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters no-client-to-client-reflection
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters no-fast-external-failover
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters no-hard-administrative-reset
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters no-ipv6-auto-ra
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters no-suppress-duplicates
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters reject-as-sets
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters route-reflector-allow-outbound-policy
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters router-id
Possible completions:
   <x.x.x.x>            Router-ID in IP address format



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters shutdown
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters suppress-fib-pending
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters tcp-keepalive
Possible completions:
   idle                 TCP keepalive idle time
   interval             TCP keepalive interval
   probes               TCP keepalive maximum probes


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters tcp-keepalive idle
Possible completions:
   <1-65535>            Idle time in seconds



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters tcp-keepalive interval
Possible completions:
   <1-65535>            Interval in seconds



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp parameters tcp-keepalive probes
Possible completions:
   <1-30>               Maximum probes



[edit]


