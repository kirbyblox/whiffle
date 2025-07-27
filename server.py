#!/usr/bin/env python

import asyncio
import json
import secrets
from collections import deque

import http
import os
import signal

from websockets.asyncio.server import serve


dict = {}
# map from key given to user -> websocket
waiting = deque()
# key of users that don't have friends or something

async def error(websocket, message):
    event = {
        "type": "error",
        "message": message,
    }
    await websocket.send(json.dumps(event))

async def send_message(websocket, event):
    try:
        peer_socket = dict[event["key"]]
    except KeyError:
        await error(websocket, "Game not found.")
        return
    await peer_socket.send(json.dumps(event))

async def init(websocket):
    key = secrets.token_urlsafe(12)
    dict[key] = websocket

    if waiting:
        partner_key = waiting.popleft()
        partner = dict[partner_key]
        event = {
            "type": "partner",
            "key": key,
            "p1": True,
        }

        await partner.send(json.dumps(event))
        event = {
            "type": "partner",
            "key": partner_key,
            "p1": False,
        }
        await websocket.send(json.dumps(event))
    else:
        waiting.append(key)
        print(f"Client {key} added to waiting queue.")
        await websocket.send(json.dumps({"type": "waiting", "message": "Waiting for a partner..."}))
    


async def cleanup(key):
    del dict[key]

async def handler(websocket):
    # Receive and parse the "init" event from the UI.
    async for message in websocket:
        event = json.loads(message)


        if event["type"] == "cleanup":
            await cleanup(websocket)
        elif event["type"] == "message":
            await send_message(websocket, event)
        else:
            await init(websocket)
        

def health_check(connection, request):
    if request.path == "/healthz":
        return connection.respond(http.HTTPStatus.OK, "OK\n")

async def main():
    port = int(os.environ.get("PORT", "8001"))
    async with serve(handler, "", port, process_request=health_check) as server:
        loop = asyncio.get_running_loop()
        loop.add_signal_handler(signal.SIGTERM, server.close)
        await server.wait_closed()


if __name__ == "__main__":
    asyncio.run(main())