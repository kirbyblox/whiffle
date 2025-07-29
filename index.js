const boxMin = 50;
const boxMax = 850;

const hitbox_width = 120;
const packet_length = 10;

let true_game_over = false;

let winner = -2;


let state = {
    player1: {
        x_pos: 150,
        punch_frame: 0,
        block_stun: 0,
        blocking: false,
    },
    player2: {
        x_pos: 750,
        punch_frame: 0,
        block_stun: 0,
        blocking: false,
    },
    game_over: false,
}

const PLAYER = Object.freeze({
    P1: 0,
    P2: 1,
})


// ring buffer for accessing frame data
class FrameBuffer {
    constructor(length) {
        this.length = length;
        this.backing_array = new Array(length);
        this.first_frame = -length+1;
        this.next = 0;
    }
    get(frame) {
        if (frame < this.first_frame || frame >= this.first_frame + this.length || frame < 0) {
            return INPUT.NONE;
        }
        return this.backing_array[(frame - this.first_frame + this.next) % this.length];
    }
    push(data) {
        this.backing_array[this.next] = data;
        this.next = (this.next + 1) % this.length;
        this.first_frame += 1;
    }
    set(frame, data) {
        if (frame == this.first_frame+this.length) {
            this.push(data);
            return 2;
        } else if (frame < this.first_frame || frame >= this.first_frame + this.length) {
            console.log("set error");
            return -1;
        }
        this.backing_array[(frame - this.first_frame + this.next) % this.length] =
            data;
        return 1;
    }
}


let local_frame = 1; 
let local_last_sync = -1;
// let local_player = Math.floor(Math.random()*2) == 0 ? PLAYER.P1 : PLAYER.P2;
// let remote_player = local_player == PLAYER.P1 ? PLAYER.P2 : PLAYER.P1;

let local_player = PLAYER.P1;
let remote_player = PLAYER.P2;




const local_input_buffer = new FrameBuffer(20);
const remote_input_buffer = new FrameBuffer(20);
const state_buffer = new FrameBuffer(20);


let remote_data = {
    s: -1, // start_frame
    a: Array(),// array
}

// 6f startup 3f active 10f recovery

const INPUT = Object.freeze({
        NONE: 0,
        LEFT: 1,
        RIGHT: 2,
        PUNCH: 3,
    });

const spriteWidth = 50;


const timestep = 1000 / 60; // in ms so (1000ms / 1s) /60fps => 1000/60 ms per frame, demo speed at 15 fps?


function update() {
    let input = INPUT.NONE;
    if (pressedKeys.has('KeyU')) {
        input = INPUT.PUNCH;
    } else {
        if (pressedKeys.has('KeyD') && pressedKeys.has('KeyA')) {
        } else {
            if (pressedKeys.has('KeyD')) {
                input = INPUT.RIGHT;
            } else if (pressedKeys.has('KeyA')) {
                input = INPUT.LEFT;
            }
        }
    }

    local_input_buffer.set(local_frame, input);

    send_data();
    // demo_sync();
    sync();

    local_frame++;
}

function update_local_input(input) {
    if (local_player == PLAYER.player1) {
        update_player_input(state.player1, input);
    } else {
        update_player_input(state.player2, input);
    }
}


function check_collision() {

    // check for hitbox collision
    const p1 = state.player1;
    const p2 = state.player2;
    p1.x_pos = Math.max(p1.x_pos, boxMin);
    p2.x_pos = Math.min(p2.x_pos, boxMax);
    
    if (p2.x_pos - p1.x_pos < 60) {
        const diff = 60-(p2.x_pos - p1.x_pos);
        if (p1.x_pos == boxMin) {
            p2.x_pos += diff;
        } else if (p2.x_pos == boxMax) {
            p1.x_pos -= diff;
        } else {
            p1.x_pos -= diff / 2;
            p2.x_pos += diff / 2;
        }
    }


    p1_body = {
        x_0 : p1.x_pos,
        x_1 : p1.x_pos + spriteWidth,
        y_0 : 250,
        y_1 : 450,
    }
    p1_fist = {
        x_0 : p1.x_pos + spriteWidth + 20,
        x_1 : p1.x_pos + spriteWidth + 20 + 120,
        y_0 : 300,
        y_1 : 335,
    }
    p1_arm = {
        x_0 : p1.x_pos + spriteWidth + 20,
        x_1 : p1.x_pos + spriteWidth + 20 + 60,
        y_0 : 300,
        y_1 : 335,
    }
    p2_body = {
        x_0 : p2.x_pos,
        x_1 : p2.x_pos + spriteWidth,
        y_0 : 250,
        y_1 : 450,
    }
    p2_fist = {
        x_0 : p2.x_pos - hitbox_width - 20,
        x_1 : p2.x_pos - hitbox_width - 20 + 120,
        y_0 : 300,
        y_1 : 335,
    }
    p2_arm = {
        x_0 : p2.x_pos - 60 - 20,
        x_1 : p2.x_pos - 60 - 20 + 60,
        y_0 : 300,
        y_1 : 335,
    }

    if (p1.punch_frame <= 12 && p1.punch_frame >= 10) {
        if (p2.punch_frame >= 13 || p2.punch_frame <= 9 && p2.punch_frame >= 5) {
            if (collides(p1_fist, p2_arm)) {
                state.game_over = true;
                true_game_over = true;
                winner = PLAYER.P1;
            }
        }
        if (collides(p1_fist, p2_body)) {
            if (p2.blocking) {
                p2.block_stun = 10;
            } else {
                state.game_over = true;
                true_game_over = true;
                winner = PLAYER.P1;
            }
        }
    }
    if (p2.punch_frame <= 12 && p2.punch_frame >= 10) {
        if (p1.punch_frame >= 13 || p1.punch_frame <= 9 && p1.punch_frame >= 5) {
            if (collides(p2_fist, p1_arm)) {
                state.game_over = true;
                true_game_over = true;
                winner = PLAYER.P2;
            }
        }
        if (collides(p2_fist, p1_body)) {
            if (p1.blocking) {
                p1.block_stun = 10;
            } else {
                state.game_over = true;
                true_game_over = true;
                winner = PLAYER.P2;
            }

        }
    }

}

function collides(rect1, rect2) {
    if (rect1.x_1 >= rect2.x_0 &&
      rect1.x_0 <= rect2.x_1 &&   
      rect1.y_1 >= rect2.y_0 &&
      rect1.y_0 <= rect2.y_1) {    
        return true;
  }
}


function update_player_input(player_enum, input) {
    let player = (player_enum == PLAYER.P1) ? state.player1 : state.player2;
    player.blocking = false;
    if (player.punch_frame < 1 && player.block_stun < 1) {
        if (input == INPUT.PUNCH) {
            player.punch_frame = 18
        } else {
            if (input == INPUT.RIGHT) {
                if (player_enum == PLAYER.P1) {
                    player.x_pos += 5;
                } else {
                    player.x_pos += 4;
                    player.blocking = true;
                }
            }
            if (input == INPUT.LEFT) {
                if (player_enum == PLAYER.P1) {
                    player.x_pos -= 4;
                    player.blocking = true;
                } else {
                    player.x_pos -= 5;
                }
            }
        }
    } else if (player.punch_frame >= 1) {
        player.punch_frame -= 1;
    } else {
        player.blocking = true;
        player.block_stun -= 1;
    }
}


// const demo_lag = 2;
// function demo_sync() {
//     // const demo_lag = Math.floor(Math.random() * 3);
//     if (local_last_sync == -1) {
//         remote_input_buffer.set(local_frame, INPUT.NONE);
//         check_collision();
//         state_buffer.set(local_frame, structuredClone(state));
//     } else {
//         const start_frame = local_frame - demo_lag - packet_length + 1;
//         const remote_msg = Array();
//         for (let i = 0; i < packet_length; i++) {
//             switch (local_input_buffer.get(start_frame+i)) {
//                 case INPUT.LEFT:
//                     remote_msg.push(INPUT.RIGHT);
//                     break;
//                 case INPUT.RIGHT:
//                     remote_msg.push(INPUT.LEFT);
//                     break;
//                 case INPUT.PUNCH:
//                     remote_msg.push(INPUT.PUNCH);
//                     break;
//                 default:
//                     remote_msg.push(INPUT.NONE);
//             }
//         }
//         let i = local_last_sync + 1;
//         // console.log("hit0");
//         // for(;i < start_frame + packet_length; i++) {
//         //     console.log("hit1");
//         //     if (remote_input_buffer.get(i+1) != remote_msg[i-start_frame-1] || state_buffer.get(i+1) == 0) {
//         //         console.log("hit2");
//         //         break;
//         //     }
//         // }
//         // seems to be going 1 state too far?

//         state = state_buffer.get(i-1);


//         // for loop from end of diff to packet_length
//         for(; i < start_frame + packet_length; i++) {
//             remote_input_buffer.set(i, remote_msg[i-start_frame]);
//             update_player_input(local_player, local_input_buffer.get(i));
//             update_player_input(remote_player, remote_input_buffer.get(i));
//             check_collision();
//             state_buffer.set(i, structuredClone(state));
//         }
//         const last_input = remote_msg.at(-1);
        
//         for(; i <= local_frame; i++) {
//             // console.log("hit last");
//             // why <=  instead of <?? 
//             remote_input_buffer.set(i, last_input);
//             update_player_input(local_player, local_input_buffer.get(i));
//             update_player_input(remote_player, remote_input_buffer.get(i));
//             check_collision()
//             state_buffer.set(i, structuredClone(state));
//         }
//         local_last_sync = Math.max(local_last_sync, start_frame + packet_length - 1); // should be start_frame + packet_length -1 ? but breaks things
//     }
// }

function sync() {
    console.log(local_frame);
    if (local_last_sync == -1) {
        update_player_input(local_player, local_input_buffer.get(local_frame));
        remote_input_buffer.set(local_frame, INPUT.NONE);
        check_collision();
        state_buffer.set(local_frame, structuredClone(state));

    } else {
        let remote = structuredClone(remote_data);
        let remote_msg = remote.a;
        let start_frame = remote.s;

        if (start_frame + packet_length - 1 > local_frame) {
            true_game_over = true;
            winner = -1;
        } else if (start_frame + packet_length - 1 <= local_last_sync) {
            remote_input_buffer.set(local_frame, remote_input_buffer.get(local_frame-1));
            update_player_input(local_player, local_input_buffer.get(local_frame));
            update_player_input(remote_player, remote_input_buffer.get(local_frame));
            check_collision();
            state_buffer.set(local_frame, structuredClone(state));
        } else {
            if (local_last_sync + 1 < start_frame || local_last_sync < local_frame - 20) {
                true_game_over = true;
                winner = -1;
                return;
            }       
            state = state_buffer.get(local_last_sync);
            let i = local_last_sync + 1;
      
            for(; i < start_frame + packet_length; i++) {
                remote_input_buffer.set(i, remote_msg[i-start_frame]);
                update_player_input(local_player, local_input_buffer.get(i));
                update_player_input(remote_player, remote_input_buffer.get(i));
                check_collision();
                state_buffer.set(i, structuredClone(state));
            }
            const last_input = remote_msg.at(-1);
        
            for(; i <= local_frame; i++) {
                remote_input_buffer.set(i, last_input);
                update_player_input(local_player, local_input_buffer.get(i));
                update_player_input(remote_player, remote_input_buffer.get(i));
                check_collision()
                state_buffer.set(i, structuredClone(state));
            }

            local_last_sync = Math.max(local_last_sync, start_frame + packet_length - 1)
        }
    }
}

function send_data() {
    let first_frame = local_frame - packet_length + 1;
    let array = Array(packet_length);
    for (let i = first_frame; i < first_frame + packet_length; i++) {
        array[i-first_frame] = local_input_buffer.get(i);
    }
    let payload = {
        s: first_frame,
        a: array,
    }
    console.log("start frame:")
    console.log(first_frame);
    dc.send(JSON.stringify(payload));
}



const pressedKeys = new Set();

document.addEventListener('keydown', (event) => {
    pressedKeys.add(event.code);
});

document.addEventListener('keyup', (event) => {
    pressedKeys.delete(event.code);
});


const canvas = document.getElementById("canvas");
function draw() {
  if (canvas.getContext) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const p1_pos = state.player1.x_pos;
    const p2_pos = state.player2.x_pos;
    ctx.strokeRect(p1_pos, 250, spriteWidth, 200);
    ctx.strokeRect(p2_pos, 250, spriteWidth, 200);

    if (state.player1.punch_frame < 1) {
        // pass
    } else if (state.player1.punch_frame < 5) {
        // pass (second half of recovery)
    } else if (state.player1.punch_frame < 10) {
        ctx.strokeRect(p1_pos+spriteWidth+20, 300, 60, 35);
    } else if (state.player1.punch_frame < 13) {
        ctx.strokeRect(p1_pos+spriteWidth+20, 300, 120, 35);
    } else {
        ctx.strokeRect(p1_pos+spriteWidth+20, 300, 60, 35);
    }
    if (state.player2.punch_frame < 1) {
        // pass
    } else if (state.player2.punch_frame < 5) {
        // pass (second half of recovery)
    } else if (state.player2.punch_frame < 10) {
        ctx.strokeRect(p2_pos-60-20, 300, 60, 35);
    } else if (state.player2.punch_frame < 13) {
        ctx.strokeRect(p2_pos-hitbox_width-20, 300, 120, 35);
    } else {
        ctx.strokeRect(p2_pos-60-20, 300, 60, 35);
    }


    if (true_game_over) {
        ctx.textAlign = "center";
        ctx.font = "40px serif";
        if (winner == PLAYER.P1) {
            ctx.fillText('Player 1 wins!', canvas.width / 2, canvas.height * (1/3));
        } else if (winner == PLAYER.P2) {
            ctx.fillText('Player 2 wins!', canvas.width / 2, canvas.height * (1/3));
        } else if (winner == -1) {
            ctx.fillText('Desync Error', canvas.width / 2, canvas.height * (1/3));
        } else {
            ctx.fillText('Connection Error', canvas.width / 2, canvas.height * (1/3));            
        }
    }
  }
}

let pc;
let dc;
let partnerKey;

const ws = new WebSocket(getWebSocketServer());
ws.onopen = () => {
    console.log("Connected to signaling server.");
    const payload = {
        type: "init",
    };
    ws.send(JSON.stringify(payload));
};

// websockets
function sendMessage(message) {
    const payload = {
        type: "message",
        key: partnerKey,
        ...message
    };
    ws.send(JSON.stringify(payload));
}

// handle messages from signaling server
ws.onmessage = async (message) => {
    const event = JSON.parse(message.data);

    switch (event.type) {
        case "waiting":
            console.log(event.message);
            break;
        case "partner":
            console.log(`Partner found! Their key is ${event.key}`);
            partnerKey = event.key;
            if (event.p1) {
                local_player = PLAYER.P1;
                remote_player = PLAYER.P2;
                console.log("I am Peer 1, creating offer...");
                await createPeerConnection();
                object = {
                    "ordered": false,
                    "maxRetransmits": 0,
                }
                dc = pc.createDataChannel("chat", object);
                setupDataChannel();
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendMessage({ sdp: pc.localDescription });
            } else {
                local_player = PLAYER.P2;
                remote_player = PLAYER.P1;
            }
            break;
        case "message":
            if (event.sdp) {
                if (!pc) {
                    await createPeerConnection();
                }
                await pc.setRemoteDescription(new RTCSessionDescription(event.sdp));
                
                if (event.sdp.type === 'offer') {
                    console.log("Received offer, creating answer...");
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendMessage({ sdp: pc.localDescription });
                }
            } else if (event.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(event.candidate));
            }
            break;
        case "error":
            console.log(`Error: ${event.message}`);
            break;
    }
};
async function createPeerConnection() {
    pc = new RTCPeerConnection();

    pc.onicecandidate = e => {
        if (e.candidate) {
            sendMessage({ candidate: e.candidate });
        }
    };

    pc.oniceconnectionstatechange = e => console.log(`ICE Connection State: ${pc.iceConnectionState}`);

    pc.ondatachannel = e => {
        dc = e.channel;
        setupDataChannel();
    };
}

function setupDataChannel() {
    dc.onopen = () => {
        console.log("start");
        lag = 0;
        previous = Date.now();
        state_buffer.set(0, structuredClone(state));
        requestAnimationFrame(mainLoop);
    };

    dc.onmessage = ( {data} ) => {
        if (local_last_sync < 0) {
            local_last_sync = 0;
        }
        remote_data = JSON.parse(data);
    }

    dc.onclose = () => {
        true_game_over = true;
    }
}

function getWebSocketServer() {
  if (window.location.host === "kirbyblox.github.io") {
    return "wss://sparkling-tonya-kirbyblox-6ffb0185.koyeb.app/";
  } else if (window.location.host === "localhost:8000") {
    return "ws://localhost:8001/";
  } else {
    throw new Error(`Unsupported host: ${window.location.host}`);
  }
}


function mainLoop() {
    let current = Date.now();
    let elapsed = current - previous;
    previous = current;
    lag += elapsed;
    // let count = 0;
    if (lag >= timestep) {
        while (lag >= timestep) {
        update();
        // count++;
        // if (count > 1) {
        //     // performance check
        //     console.log(count);
        // }
        lag -= timestep;
        }
        draw();
    }
    if (!true_game_over) {
        requestAnimationFrame(mainLoop);
    }
} 


// let lag;
// let previous;

// state_buffer.set(0, structuredClone(state));
// requestAnimationFrame(mainLoop);