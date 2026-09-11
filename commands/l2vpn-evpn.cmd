vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn
Possible completions:
 > advertise            Advertise prefix routes
   advertise-all-vni    Advertise All local VNIs
   advertise-default-gw Advertise All default g/w mac-ip routes in EVPN
   advertise-pip        EVPN system primary IP
   advertise-svi-ip     Advertise svi mac-ip routes in EVPN
 > default-originate    Originate a default route
   disable-ead-evi-rx   Activate PE on EAD-ES even if EAD-EVI is not received
   disable-ead-evi-tx   Do not advertise EAD-EVI for local ESs
 > ead-es-frag          EAD ES fragment config
 > ead-es-route-target  EAD ES Route Target
 > flooding             Specify handling for BUM packets
 > mac-vrf              EVPN MAC-VRF
   rd                   Route Distinguisher
 > route-target         Route Target
   rt-auto-derive       Auto derivation of Route Target (RFC8365)
+> vni                  VXLAN Network Identifier


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn ad
advertise             advertise-all-vni     advertise-default-gw  advertise-pip         advertise-svi-ip
[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise
Possible completions:
 > ipv4                 IPv4 address family
 > ipv6                 IPv6 address family


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise iPV

  Configuration path: vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise [iPV] is not valid

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise ipv4
Possible completions:
 > unicast              IPv4 address family


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise ipv4 unicast
Possible completions:
   route-map            Specify route-map name to use


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise ipv4 unicast route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise ipv6
Possible completions:
 > unicast              IPv4 address family


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise ipv6 unicast
Possible completions:
   route-map            Specify route-map name to use


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise ipv6 unicast route-map
Possible completions:
   <text>               Route map name
   rm01


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise-all-vni
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise-default-gw
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise-pip
Possible completions:
   <x.x.x.x>            IP address



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise-pip 1.1.1.
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn advertise-svi-ip
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn default-originate
Possible completions:
   ipv4                 IPv4 address family
   ipv6                 IPv6 address family


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn default-originate ipv4
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn default-originate ipv6
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn disable-ead-evi-rx
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn disable-ead-evi-tx
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn ead-es-frag
Possible completions:
   evi-limit            EVIs per-fragment


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn ead-es-frag evi-limit
Possible completions:
   <1-1000>             limit



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn ead-es-frag evi-limit 1
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn ead-es-route-target
Possible completions:
+  export               Route Target export


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn ead-es-route-target export
Possible completions:
   <text>               Route target (A.B.C.D:MN|EF:OPQR|GHJK:MN)



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn flooding
Possible completions:
   disable              Disable instance
   head-end-replication Flood BUM packets using head-end replication


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn flooding disable
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn flooding head-end-replication
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn mac-vrf
Possible completions:
   soo                  Site-of-Origin extended community


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn mac-vrf soo
Possible completions:
   ASN:NN               based on autonomous system number in format <0-65535:0-4294967295>
   IP:NN                Based on a router-id IP address in format <IP:0-65535>



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn rd
Possible completions:
   ASN:NN_OR_IP-ADDRESS:NN
                        Route Distinguisher, (x.x.x.x:yyy|xxxx:yyyy)



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn route-target
Possible completions:
+  both                 Route Target both import and export
+  export               Route Target export
+  import               Route Target import


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn route-target both
Possible completions:
   <text>               Route target (A.B.C.D:MN|EF:OPQR|GHJK:MN)



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn route-target export
Possible completions:
   <text>               Route target (A.B.C.D:MN|EF:OPQR|GHJK:MN)



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn route-targetim

  Configuration path: vrf name vrf03 protocols bgp address-family l2vpn-evpn [route-targetim] is not valid

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn route-targetim

  Configuration path: vrf name vrf03 protocols bgp address-family l2vpn-evpn [route-targetim] is not valid

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn route-target import
Possible completions:
   <text>               Route target (A.B.C.D:MN|EF:OPQR|GHJK:MN)



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn rt-auto-derive
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn vni
Possible completions:
 > <1-16777215>         VNI number
 >


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn vni 1
Possible completions:
   advertise-default-gw Advertise All default g/w mac-ip routes in EVPN
   advertise-svi-ip     Advertise svi mac-ip routes in EVPN
   rd                   Route Distinguisher
 > route-target         Route Target


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn vni 1 advertise-default-gw
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn vni 1 advertise-svi-ip
Possible completions:
  <Enter>       Execute the current command

[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn vni 1 rd
Possible completions:
   ASN:NN_OR_IP-ADDRESS:NN
                        Route Distinguisher, (x.x.x.x:yyy|xxxx:yyyy)



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn vni 1 route-target
Possible completions:
+  both                 Route Target both import and export
+  export               Route Target export
+  import               Route Target import


[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn vni 1 route-target both
Possible completions:
   <text>               Route target (A.B.C.D:MN|EF:OPQR|GHJK:MN)



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn vni 1 route-target export
Possible completions:
   <text>               Route target (A.B.C.D:MN|EF:OPQR|GHJK:MN)



[edit]
vyos@vyos# set vrf name vrf03 protocols bgp address-family l2vpn-evpn vni 1 route-target import
Possible completions:
   <text>               Route target (A.B.C.D:MN|EF:OPQR|GHJK:MN)

