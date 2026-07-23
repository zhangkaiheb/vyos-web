#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Standalone WebSocket server for real-time VyOS monitor data.

This server is intended to run behind Apache's mod_proxy_wstunnel,
exposed at /ws/ and forwards to ws://127.0.0.1:8765/.

Example client path: wss://<vyos-ip>/ws/monitor
"""

import asyncio
import base64
import hashlib
import json
import os
import random
import sys
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, '/usr/libexec/vyos')

WS_MAGIC = b'258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
HOST = os.environ.get('VYOS_WS_HOST', '127.0.0.1')
PORT = int(os.environ.get('VYOS_WS_PORT', '8765'))
HEARTBEAT_INTERVAL = 30


def get_sample_monitor_data():
    """Return sample monitor data; replace with real VyOS command calls as needed."""
    return {
        'type': 'monitor',
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
        'data': {
            'cpu': {
                'usage': round(random.uniform(5, 45), 2),
                'user': round(random.uniform(2, 20), 2),
                'system': round(random.uniform(1, 15), 2),
                'idle': round(random.uniform(40, 90), 2),
            },
            'memory': {
                'used': round(random.uniform(20, 60), 2),
                'free': round(random.uniform(10, 40), 2),
                'total': 80.0,
                'usage': round(random.uniform(25, 75), 2),
            },
            'conntrack': {
                'count': int(random.uniform(100, 5000)),
                'max': 65536,
            },
        },
    }


async def send_frame(writer, opcode, payload):
    """Send a single WebSocket frame."""
    header = bytearray()
    length = len(payload)
    header.append(0x80 | opcode)
    if length < 126:
        header.append(length)
    elif length < 65536:
        header.append(126)
        header.extend(length.to_bytes(2, 'big'))
    else:
        header.append(127)
        header.extend(length.to_bytes(8, 'big'))
    writer.write(header + payload)
    await writer.drain()


async def recv_frame(reader):
    """Receive a single WebSocket frame; return (opcode, payload) or None on close."""
    first = await reader.read(1)
    if not first:
        return None, None
    opcode = first[0] & 0x0F
    masked = (await reader.read(1))[0] & 0x80
    length = (await reader.read(1))[0] & 0x7F
    if length == 126:
        length = int.from_bytes(await reader.read(2), 'big')
    elif length == 127:
        length = int.from_bytes(await reader.read(8), 'big')
    if masked:
        mask = await reader.read(4)
        payload = bytearray(await reader.read(length))
        for i in range(length):
            payload[i] ^= mask[i % 4]
    else:
        payload = await reader.read(length)
    return opcode, bytes(payload)


async def handle_client(reader, writer):
    """Handle one WebSocket connection."""
    addr = writer.get_extra_info('peername')
    print(f'Connection from {addr}')
    try:
        # Read HTTP upgrade request
        request = await reader.readuntil(b'\r\n\r\n')
        headers = request.decode('utf-8', errors='ignore').split('\r\n')
        key = None
        path = '/'
        for line in headers:
            if line.startswith('GET'):
                parts = line.split()
                if len(parts) >= 2:
                    path = parts[1]
            elif line.lower().startswith('sec-websocket-key:'):
                key = line.split(':', 1)[1].strip()
        if not key:
            writer.close()
            await writer.wait_closed()
            return

        accept = base64.b64encode(hashlib.sha1((key + WS_MAGIC.decode()).encode()).digest()).decode()
        response = (
            'HTTP/1.1 101 Switching Protocols\r\n'
            'Upgrade: websocket\r\n'
            'Connection: Upgrade\r\n'
            f'Sec-WebSocket-Accept: {accept}\r\n'
            '\r\n'
        )
        writer.write(response.encode())
        await writer.drain()

        print(f'WebSocket upgraded for path {path} from {addr}')

        async def heartbeat():
            while True:
                await asyncio.sleep(HEARTBEAT_INTERVAL)
                try:
                    await send_frame(writer, 0x09, b'')  # ping
                except Exception:
                    break

        async def monitor_stream():
            while True:
                await asyncio.sleep(2)
                data = get_sample_monitor_data()
                if path.startswith('/monitor'):
                    data['channel'] = 'monitor'
                try:
                    await send_frame(writer, 0x01, json.dumps(data, ensure_ascii=False).encode('utf-8'))
                except Exception:
                    break

        async def read_loop():
            while True:
                opcode, payload = await recv_frame(reader)
                if opcode is None:
                    break
                if opcode == 0x08:  # close
                    break
                if opcode == 0x0A:  # pong
                    continue

        await asyncio.gather(read_loop(), heartbeat(), monitor_stream())
    except asyncio.IncompleteReadError:
        pass
    except Exception as e:
        print(f'Error handling {addr}: {e}')
    finally:
        print(f'Connection closed {addr}')
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass


async def main():
    server = await asyncio.start_server(handle_client, HOST, PORT)
    print(f'VyOS Web Config WebSocket server listening on ws://{HOST}:{PORT}')
    async with server:
        await server.serve_forever()


if __name__ == '__main__':
    asyncio.run(main())
