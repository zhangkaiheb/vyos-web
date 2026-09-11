vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast
Possible completions:
+> aggregate-address    BGP aggregate network
 > distance             Administrative distances for BGP routes
 > export               Export routes from this address-family
 > import               Import routes to this address-family
 > label                Label value for VRF
 > maximum-paths        Forward packets over multiple paths
+> network              BGP network
 > nexthop              Specify next hop to use for VRF advertised prefixes
 > rd                   Specify route distinguisher
 > redistribute         Redistribute routes from other protocols into BGP
 > route-map            Route-map to filter route updates to/from this peer
 > route-target         Specify route target list
 > sid                  SID value for VRF


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast aggregate-address
Possible completions:
 > <x.x.x.x/x>          BGP aggregate network
 >


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast aggregate-address 1.1.1.1
Possible completions:
   as-set               Generate AS-set path information for this aggregate address
   route-map            Specify route-map name to use
   summary-only         Announce the aggregate summary network only


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast aggregate-address 1.1.1.1 as-set
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast aggregate-address 1.1.1.1 route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast aggregate-address 1.1.1.1 summary-only
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast distance
Possible completions:
   external             eBGP routes administrative distance
   internal             iBGP routes administrative distance
   local                Locally originated BGP routes administrative distance
+> prefix               Administrative distance for a specific BGP prefix


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast distance external
Possible completions:
   <1-255>              eBGP routes administrative distance



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast distance internal
Possible completions:
   <1-255>              iBGP routes administrative distance



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast distance local
Possible completions:
   <1-255>              Locally originated BGP routes administrative distance



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast distance prefix
Possible completions:
 > <x.x.x.x/x>          Administrative distance for a specific BGP prefix
 >


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast distance prefix 2.2.2.2
Possible completions:
   distance             Administrative distance for prefix


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast distance prefix 2.2.2.2 distance
Possible completions:
   <1-255>              Administrative distance for external BGP routes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast export
Possible completions:
   vpn                  to/from default instance VPN RIB


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast export vpn
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast import
Possible completions:
   vpn                  to/from default instance VPN RIB
+  vrf                  VRF to import from


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast import vpn
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast import vrf
Possible completions:
   <text>               VRF instance name
   default
   vrf01
   vrf02


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast label
Possible completions:
 > vpn                  Between current address-family and VPN


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast label vpn
Possible completions:
 > allocation-mode      Label allocation mode
   export               For routes leaked from current address-family to VPN


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast label vpn allocation-mode
Possible completions:
   per-nexthop          Allocate a label per connected next-hop in the VRF


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast label vpn allocation-mode per-nexthop
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast label vpn export
Possible completions:
   auto                 Automatically assign a label
   <0-1048575>          Label Value



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast maximum-paths
Possible completions:
   ebgp                 eBGP maximum paths
   ibgp                 iBGP maximum paths


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast maximum-paths
Possible completions:
   ebgp                 eBGP maximum paths
   ibgp                 iBGP maximum paths


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast maximum-paths ebgp
Possible completions:
   <1-256>              Number of paths to consider



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast maximum-paths ibgp
Possible completions:
   <1-256>              Number of paths to consider



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast network
Possible completions:
 > <x.x.x.x/x>          BGP network
 >


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast network 2.2.2.2
Possible completions:
   backdoor             Network as a backdoor route
   route-map            Specify route-map name to use


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast network 2.2.2.2 backdoor
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast network 2.2.2.2 route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast nexthop
Possible completions:
 > vpn                  Between current address-family and vpn


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast nexthop vpn
Possible completions:
   export               For routes leaked from current address-family to vpn


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast nexthop vpn export
Possible completions:
   <x.x.x.x>            BGP neighbor IP address
   <h:h:h:h:h:h:h:h>    BGP neighbor IPv6 address



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast nexthop vpn export 2.2.2.2
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast rd
Possible completions:
 > vpn                  Between current address-family and VPN


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast rd vpn
Possible completions:
   export               For routes leaked from current address-family to VPN


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast rd vpn export
Possible completions:
   ASN:NN_OR_IP-ADDRESS:NN
                        Route Distinguisher, (x.x.x.x:yyy|xxxx:yyyy)

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute
Possible completions:
 > babel                Redistribute Babel routes into BGP
 > connected            Redistribute connected routes into BGP
 > isis                 Redistribute IS-IS routes into BGP
 > kernel               Redistribute kernel routes into BGP
 > nhrp                 Redistribute NHRP routes into BGP
 > ospf                 Redistribute OSPF routes into BGP
 > rip                  Redistribute RIP routes into BGP
 > static               Redistribute static routes into BGP
+> table                Redistribute non-main Kernel Routing Table


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute babel
Possible completions:
   metric               Metric for redistributed routes
   route-map            Specify route-map name to use


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute babel metric
Possible completions:
   <1-4294967295>       Metric for redistributed routes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute babel route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute connected
Possible completions:
   metric               Metric for redistributed routes
   route-map            Specify route-map name to use


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute connected metric
Possible completions:
   <1-4294967295>       Metric for redistributed routes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute connected route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute isis
Possible completions:
   metric               Metric for redistributed routes
   route-map            Specify route-map name to use


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute isis metric
Possible completions:
   <1-4294967295>       Metric for redistributed routes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute isis route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute kernel
Possible completions:
   metric               Metric for redistributed routes
   route-map            Specify route-map name to use


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute kernel metric
Possible completions:
   <1-4294967295>       Metric for redistributed routes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute kernel route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute nhrp
Possible completions:
   metric               Metric for redistributed routes
   route-map            Specify route-map name to use


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute nhrp metric
Possible completions:
   <1-4294967295>       Metric for redistributed routes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute nhrp route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute ospf
Possible completions:
   metric               Metric for redistributed routes
   route-map            Specify route-map name to use


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute ospf metric
Possible completions:
   <1-4294967295>       Metric for redistributed routes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute ospf route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute rip
Possible completions:
   metric               Metric for redistributed routes
   route-map            Specify route-map name to use


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute rip metric
Possible completions:
   <1-4294967295>       Metric for redistributed routes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute rip route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute static
Possible completions:
   metric               Metric for redistributed routes
   route-map            Specify route-map name to use


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute static metric
Possible completions:
   <1-4294967295>       Metric for redistributed routes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute static route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute table
Possible completions:
 > <1-200>              Policy route table number
 > 20


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute table 20
Possible completions:
   metric               Metric for redistributed routes
   route-map            Specify route-map name to use


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute table 20 metric
Possible completions:
   <1-4294967295>       Metric for redistributed routes



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute table 20 route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast redistribute table 20 route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast route-map
Possible completions:
 > vpn                  Between current address-family and VPN
 > vrf                  Between current address-family and VRF


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast route-map vpn
Possible completions:
   export               Route-map to filter outgoing route updates
   import               Route-map to filter incoming route updates


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast route-map vpn export
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast route-map vpn import
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast route-map vrf
Possible completions:
   import               Route-map to filter incoming route updates


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast route-map vrf import
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast route-target
Possible completions:
 > vpn                  Between current address-family and VPN


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast route-target vpn
Possible completions:
   both                 Route Target both import and export
   export               Route Target export
   import               Route Target import


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast route-target vpn
Possible completions:
   both                 Route Target both import and export
   export               Route Target export
   import               Route Target import


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast route-target vpn both
Possible completions:
   <text>               Space separated route target list (A.B.C.D:MN|EF:OPQR|GHJK:MN)



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast route-target vpn export
Possible completions:
   <text>               Space separated route target list (A.B.C.D:MN|EF:OPQR|GHJK:MN)



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast route-target vpn import
Possible completions:
   <text>               Space separated route target list (A.B.C.D:MN|EF:OPQR|GHJK:MN)



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast sid
Possible completions:
 > vpn                  Between current VRF and VPN


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast sid vpn
Possible completions:
   export               For routes leaked from current VRF to VPN


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family ipv4-unicast sid vpn export
Possible completions:
   <1-1048575>          SID allocation index
   auto                 Automatically assign a label
