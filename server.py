#!/usr/bin/env python

import asyncio
import json
import secrets
from collections import deque

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
        


async def main():
    async with serve(handler, "", 8001) as server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())