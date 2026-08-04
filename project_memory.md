## Hard Constraints
- Web configuration system must replicate VyOS configure command line structure with three-level menus
- All new web function files must be placed in independent directory /opt/vyos-web-config/, no modification to original system files
- Frontend lists must support create/edit/delete/move, row checkboxes, column adjustment, filtering, and pagination
- Popups must be non-browser native, movable, and clicking outside the popup area does not close the popup
- Language support includes English and Chinese (default Chinese), with extensibility for Russian, German, French, traditional Chinese, Korean
- User authentication uses Linux system user management
- User login supports up to 8 allowed IPs/IP segments
- User login supports up to 8 allowed MAC addresses
- Access control tables must configure read/write/readwrite permissions for 1/2/3-level pages; unconfigured items do not display
- Frontend must use Vue.js; Flask is not used
- Backend must use Apache HTTP server with mod_wsgi
- Web configuration pages must display clear error prompts with code, message, detail, suggestion, and trace
- Web configuration pages must show corresponding command line configuration when available
- Uncommon advanced configuration options must be collapsible under 'Advanced Options' sections
- Design style: selected color is light blue
- Each page must have a help icon button linking to local help documentation
- Web application must support independent updates without device restart, with version number display
- Input fields must validate IPv4/IPv6 addresses and other formats
- Configuration must use VyOS native settings; SQLite only for history states and logs
- conntrack creation/destruction logs must be toggleable
- Firewall rule logs and operation logs must be saved to SQLite database
- Table entry pages must include add/edit/delete buttons with all configurable items in popups
- System-wide configuration files must support password-protected import/export
- Firewall rule pages must support Excel import/export
- Firewall rule tables must display Packets/Bytes columns and have clear count buttons
- Table entry specifications (rule, nat, group, netns, vrf) default to 1024, configurable 1-64k
- Table entries must track reference relationships; cannot delete if referenced, with reference count column
- Physical Ethernet interfaces (names without '.') cannot be renamed or deleted
- VLAN interfaces are named with format ethX.Y (e.g., eth1.10)
- QinQ interfaces are named with format ethX.Y.Z (e.g., eth1.20.30)
- Interface list pages must display interface type (Ethernet/VLAN/QinQ) as a dedicated column
- Interface status column must use icons (green dot for UP, gray dot for other states) 
- Form field grouping: related config items from the same CLI command level must be wrapped in a card-style container with a header bar

## Engineering Conventions
- Web Shell module: dark terminal interface (background #1e1e1e), command history with color coding (yellow for commands, gray for output, red for errors), auto-scroll to latest output
- Web Shell input: visible bottom input area with prompt, uses @keyup.enter event for command execution, Tab key enabled for command completion
- Table structure: <tr> elements must be wrapped in <tbody> to comply with HTML specifications

## Lessons Learned
- koa-connect wrapper caused ctx leaks in middleware; native Koa implementation required instead
- Web Shell textarea covering entire terminal area blocks scrolling; input area should be restricted to bottom section
- Vyatta-op-cmd-wrapper does not support '?' syntax; backend must handle help commands separately to return success status