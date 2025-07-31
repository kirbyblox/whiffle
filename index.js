const boxMin = 50;
const boxMax = 900;

const hitbox_width = 120;
const packet_length = 20;

let offset = 0;

const sync_polls = 4;

let poll_count = 0;

let t_0 = -1;

const offset_array = Array(sync_polls);
const delta_array = Array(sync_polls);

let synced = false;

let true_game_over = false;

let demo_mode = true;

let winner = -2;

let state = {
    player1: {
        x_pos: 150,
        punch_frame: 0,
        block_stun: 0,
        blocking: false,
    },
    player2: {
        x_pos: 800,
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
let local_last_sync = 0;
// let local_player = Math.floor(Math.random()*2) == 0 ? PLAYER.P1 : PLAYER.P2;
// let remote_player = local_player == PLAYER.P1 ? PLAYER.P2 : PLAYER.P1;

let local_player = PLAYER.P1;
let remote_player = PLAYER.P2;




let local_input_buffer = new FrameBuffer(40);
let remote_input_buffer = new FrameBuffer(40);
let state_buffer = new FrameBuffer(40);


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
    if (demo_mode) {
        update_player_input(local_player, input);
        local_input_buffer.set(local_frame, input);
        demo_sync();
        check_collision();
        state_buffer.set(local_frame, structuredClone(state));
    } else {
        send_data();
        sync();
    }

    local_frame++;
}


function resolve_collision(spacing) {
    const p1 = state.player1;
    const p2 = state.player2;
    if (p2.x_pos - p1.x_pos < spacing) {
        const diff = spacing-(p2.x_pos - p1.x_pos);

        p1_give = p1.x_pos - boxMin;
        p2_give = boxMax - p2.x_pos;
        
        p1_step = Math.min(p1_give, diff);
        p2_step = Math.min(p2_give, diff);

        if (p1_step < diff) {
            p1.x_pos -= p1_step;
            p2.x_pos += diff-p1_step;
        } else if (p2_step < diff) {
            p1.x_pos -= diff-p2_step;
            p2.x_pos += p2_step;
        } else {
            p1.x_pos -= diff / 2;
            p2.x_pos += diff / 2;
        }
    }
}


function check_collision() {

    // check for hitbox collision
    const p1 = state.player1;
    const p2 = state.player2;
    p1.x_pos = Math.max(p1.x_pos, boxMin);
    p2.x_pos = Math.min(p2.x_pos, boxMax);
    
    resolve_collision(60);


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
    let player1_hit = false;
    let player2_hit = false;

    if (p1.punch_frame <= 12 && p1.punch_frame >= 10) {
        if (p2.punch_frame >= 13 || p2.punch_frame <= 9 && p2.punch_frame >= 5) {
            if (collides(p1_fist, p2_arm)) {
                player2_hit = true;
            }
        } else if (collides(p1_fist, p2_body)) {
            if (p2.blocking) {
                resolve_collision(140);
                p2.block_stun = 10;
            } else {
                player2_hit = true;
            }
        }
    }
    if (p2.punch_frame <= 12 && p2.punch_frame >= 10) {
        if (p1.punch_frame >= 13 || p1.punch_frame <= 9 && p1.punch_frame >= 5) {
            if (collides(p2_fist, p1_arm)) {
                player1_hit = true;
            }
        } else if (collides(p2_fist, p1_body)) {
            if (p1.blocking) {
                resolve_collision(140);
                p1.block_stun = 10;
            } else {
                player1_hit = true;
            }
        }
    }

    if (p2.punch_frame <= 12 && p2.punch_frame >= 10 && p1.punch_frame <= 12 && p1.punch_frame >= 10) {
        resolve_collision(335);
    }

    if (player1_hit && player2_hit) {
        resolve_collision(240);

    } else if (player1_hit) {

        state.game_over = true;
        winner = PLAYER.P2;
    } else if (player2_hit) {

        state.game_over = true;
        winner = PLAYER.P1;
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


const demo_lag = 5; // change to 12?
function demo_sync() {
    if (local_frame <= demo_lag) {
        remote_input_buffer.set(local_frame, INPUT.NONE);
        check_collision();
        state_buffer.set(local_frame, structuredClone(state));

    } else {
        const start_frame = local_frame - demo_lag - packet_length + 1;
        const remote_msg = Array();
        for (let i = 0; i < packet_length; i++) {
            switch (local_input_buffer.get(start_frame+i)) {
                case INPUT.LEFT:
                    remote_msg.push(INPUT.RIGHT);
                    break;
                case INPUT.RIGHT:
                    remote_msg.push(INPUT.LEFT);
                    break;
                case INPUT.PUNCH:
                    remote_msg.push(INPUT.PUNCH);
                    break;
                default:
                    remote_msg.push(INPUT.NONE);
            }
        }
        let i = local_last_sync + 1;

        state = state_buffer.get(i-1);
        if(state.game_over) {
            true_game_over = true;
            return;
        }

        // for loop from end of diff to packet_length
        for(; i < start_frame + packet_length; i++) {
            remote_input_buffer.set(i, remote_msg[i-start_frame]);
            update_player_input(local_player, local_input_buffer.get(i));
            update_player_input(remote_player, remote_input_buffer.get(i));
            check_collision();
            state_buffer.set(i, structuredClone(state));
        }
        const last_input = remote_msg.at(-1);
        
        for(; i <= local_frame; i++) {
            // console.log("hit last");
            // why <=  instead of <?? 
            remote_input_buffer.set(i, last_input);
            update_player_input(local_player, local_input_buffer.get(i));
            update_player_input(remote_player, remote_input_buffer.get(i));
            check_collision()
            state_buffer.set(i, structuredClone(state));
        }
        local_last_sync = Math.max(local_last_sync, start_frame + packet_length - 1); // should be start_frame + packet_length -1 ? but breaks things
    }
}

function sync() {
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
            console.log("message from future");
            state = state_buffer.get(local_last_sync);
            let i = local_last_sync + 1;
            for(; i <= local_frame; i++) {
                remote_input_buffer.set(i, remote_msg[i-start_frame]);
                update_player_input(local_player, local_input_buffer.get(i));
                update_player_input(remote_player, remote_input_buffer.get(i));
                check_collision()
                state_buffer.set(i, structuredClone(state));
            }
            local_last_sync = Math.max(local_last_sync, start_frame + packet_length - 1);
        } else if (start_frame + packet_length - 1 <= local_last_sync) {
            remote_input_buffer.set(local_frame, remote_input_buffer.get(local_frame-1));
            update_player_input(local_player, local_input_buffer.get(local_frame));
            update_player_input(remote_player, remote_input_buffer.get(local_frame));
            check_collision();
            state_buffer.set(local_frame, structuredClone(state));
        } else {
            if (local_last_sync + 1 < start_frame || local_last_sync < local_frame - 40) {
                console.log("too much desync")
                // true_game_over = true;
                // winner = -1;
                // return;
            }       
            state = state_buffer.get(local_last_sync);
            let i = local_last_sync + 1;
      
            for(; i < start_frame + packet_length; i++) {
                remote_input_buffer.set(i, remote_msg[i-start_frame]);
                update_player_input(local_player, local_input_buffer.get(i));
                update_player_input(remote_player, remote_input_buffer.get(i));
                check_collision();
                if (state.game_over) {
                    true_game_over = true;
                    return;
                }
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
        t: 6,
        s: first_frame,
        a: array,
    }
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


    if (state.game_over) {
        ctx.textAlign = "center";
        ctx.font = "40px serif";
        if (winner == PLAYER.P1) {
            console.log("player 1 wins");
            ctx.fillText('Player 1 wins!', canvas.width / 2, canvas.height * (1/3));
        } else if (winner == PLAYER.P2) {
            console.log("player 2 wins");
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
            } else if (event.timestamp) {
                previous = event.timestamp;
                setupOnline();
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

function syncedTime() {
    return Date.now() - offset;
}

function setupOnline() {
    demo_mode = false;
    local_last_sync = -1;
    state = {
        player1: {
        x_pos: 150,
            punch_frame: 0,
            block_stun: 0,
            blocking: false,
        },
        player2: {
            x_pos: 800,
            punch_frame: 0,
            block_stun: 0,
            blocking: false,
        },
        game_over: false,
    }
    local_frame = 1;
    local_input_buffer = new FrameBuffer(40);
    remote_input_buffer = new FrameBuffer(40);
    state_buffer = new FrameBuffer(40);
    state_buffer.set(0, structuredClone(state));
}


function setupDataChannel() {
    dc.onopen = () => {
        // if (local_player == PLAYER.P1) {
            // previous = syncedTime()+ 3000;
            // const payload = {
            //     timestamp: previous,
            // }
            // sendMessage(payload);
            // setupOnline();
        // }
        if (local_player == PLAYER.P1) {
            t_0 = Date.now();
            dc.send(JSON.stringify({t:0, t_0: t_0}));
        }
    };

    dc.onmessage = ( {data} ) => {
        // if (local_last_sync < 0) {
        //     local_last_sync = 0;
        // }
        const timestamp = Date.now();
        remote_data = JSON.parse(data);
        switch (remote_data.t) {
            case 0:
                dc.send(JSON.stringify({t: 1, t_1: timestamp, t_2: Date.now()}));
                break;
            case 1:
                if (poll_count < sync_polls) {
                    offset_array[poll_count] = (remote_data.t_1- t_0) +(remote_data.t_2 - timestamp) / 2;
                    delta_array[poll_count] = (timestamp - t_0) - (remote_data.t_2 - remote_data.t_1);
                }
                poll_count += 1;
                if (poll_count == sync_polls) {
                    console.log(offset_array);
                    console.log(delta_array);
                    offset = offset_array[delta_array.indexOf(Math.min(...delta_array))];
                    const start = syncedTime() + 3000;
                    dc.send(JSON.stringify({t: 2, s: start}));
                    previous = start;
                    setupOnline();
                } else {
                    t_0 = Date.now();
                    dc.send(JSON.stringify({t:0, t_0: t_0}));
                }
                break;
            case 2:
                previous = remote_data.s;
                setupOnline();
                break;
            default:
                if (local_last_sync < 0) {
                    local_last_sync = 0;
                }
        }
    };

    dc.onclose = () => {
        console.log("dc closed");
        true_game_over = true;
    };
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
    let current = syncedTime();
    if (current < previous) {
        const ctx = canvas.getContext("2d");
        ctx.font = "40px serif";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let time = Math.ceil((previous - current)/1000).toString(); 
        ctx.fillText(time, canvas.width / 2, canvas.height * (1/3));
        requestAnimationFrame(mainLoop);
    } else {
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
}


// let lag;
// let previous;

// state_buffer.set(0, structuredClone(state));
// requestAnimationFrame(mainLoop);

lag = 0;
previous = Date.now() + 10000;
state_buffer.set(0, structuredClone(state));
requestAnimationFrame(mainLoop);