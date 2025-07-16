var boxPos = 50;

var boxMin = 50;
var boxMax = 950;
var stunFrame = 0;

var frame = 5;
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




    if (stunFrame < 1) {
        if (input == INPUT.PUNCH) { 
            stunFrame = 18
        } else {
            if (input == INPUT.RIGHT) {
                boxPos += 4;
            }
            if (input == INPUT.LEFT) {
                boxPos -= 4;
            }
        }
        boxPos = boxPos < boxMin ? boxMin : boxPos;
        boxPos = boxPos > boxMax ? boxMax : boxPos;
        // todo: add collision when multiplayer

    } else {
        stunFrame -= 1;
    }

    // check for collisions and stuff

    frame += 1;
}

function sync () {

    // extract array of inputs from packet
    // last_frame = udp.start_frame + ARRAY_LENGTH
    
    // for i from last_sync to last_frame:
    //     if input[i] == predictedinput[i]:
                //pass
            //else:
            // break
    // simulate game with 
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
    ctx.strokeRect(boxPos, 250, spriteWidth, 200);
    if ((stunFrame) < 1) {
        // pass
    } else if (stunFrame < 10) {
        ctx.strokeRect(boxPos+spriteWidth+20, 300, 120, 35);
    } else if (stunFrame < 13) {
        ctx.strokeRect(boxPos+spriteWidth+20, 300, 120, 75);
    } else {
        ctx.strokeRect(boxPos+spriteWidth+20, 300, 60, 35);
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