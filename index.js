// var boxPos = 50;

const boxMin = 50;
const boxMax = 950;
var stun_frame = 0;


var state = {
    player1: {
        x_pos: 50,
        stun_frame: 0,
    },
    player2: {
        x_pos: 850,
        stun_frame: 0,
    },
    game_over: false,
}


var frame = 0;
var last_sync = 0;

// 6f startup 3f active 10f recovery

const INPUT = Object.freeze({
        NONE: 0,
        LEFT: 1,
        RIGHT: 2,
        PUNCH: 3,
    });

const spriteWidth = 100;

function update() {
    let input = INPUT.NONE;
    if (pressedKeys.has('KeyC')) {
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


    // call sync? or should sync be asynchronous when each input comes in


    // this should probably be a method with input input
    update_p1_input(input);

    // check for collisions and stuff

    frame += 1;
}

function update_p1_input(input) {
    if (state.player1.stun_frame < 1) {
        if (input == INPUT.PUNCH) { 
            state.player1.stun_frame = 18
        } else {
            if (input == INPUT.RIGHT) {
                console.log("hit");
                state.player1.x_pos += 4;
            }
            if (input == INPUT.LEFT) {
                state.player1.x_pos -= 4;
            }
        }
        state.player1.x_pos = state.player1.x_pos < boxMin ? boxMin : state.player1.x_pos;
        state.player1.x_pos = state.player1.x_pos > state.player2.x_pos ? state.player2.x_pos : state.player1.x_pos;
    } else {
        state.player1.stun_frame -= 1;
    }
}

function sync () {

    // extract array of inputs from packet
    // last_frame = udp.start_frame + ARRAY_LENGTH
    
    // for i from last_sync to last_frame:
    //     if input[i] == predictedinput[i]:
                //pass
            //else:
            // break
    // simulate game with those inputs
    // last_sync = last_frame
    // for last_sync to last_
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
    const canvas = document.getElementById("canvas");
  if (canvas.getContext) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 1000, 500);
    const p1_pos = state.player1.x_pos;
    const p2_pos = state.player2.x_pos;
    ctx.strokeRect(p1_pos, 250, spriteWidth, 200);
    ctx.strokeRect(p2_pos, 250, spriteWidth, 200);

    console.log(state.player1.stun_frame);
    if (state.player1.stun_frame < 1) {
        // pass
    } else if (state.player1.stun_frame < 10) {
        ctx.strokeRect(p1_pos+spriteWidth+20, 300, 120, 35);
    } else if (state.player1.stun_frame < 13) {
        ctx.strokeRect(p1_pos+spriteWidth+20, 300, 120, 75);
    } else {
        // ctx.strokeRect(p1_pos+spriteWidth+20, 300, 60, 35);
    }
  }
}


const timestep = 1000 / 60; // 1/60fps




function mainLoop() {
    let current = Date.now();
    let elapsed = current - previous;
    previous = current;
    lag += elapsed;
    while (lag >= timestep) {
        update();
        lag -= timestep;
    }
    draw();
    requestAnimationFrame(mainLoop);
}

let lag = 0;
let previous = Date.now();


requestAnimationFrame(mainLoop);