const boxMin = 50;
const boxMax = 850;

const hitbox_width = 120;

let true_game_over = false;


var state = {
    player1: {
        x_pos: 150,
        punch_frame: 0,
    },
    player2: {
        x_pos: 750,
        punch_frame: 0,
    },
    game_over: false,
}

const PLAYER = Object.freeze({
    P1: 0,
    P2: 1,
})


let frame = 0;
let last_sync = 0;

let local_player = Math.floor(Math.random()*2) == 0 ? PLAYER.P1 : PLAYER.P2;




// 6f startup 3f active 10f recovery

const INPUT = Object.freeze({
        NONE: 0,
        LEFT: 1,
        RIGHT: 2,
        PUNCH: 3,
    });

const spriteWidth = 50;

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
    sync();

    // this should probably be a method with input input
    update_player_input(local_player, input);

    // check for collisions and stuff
    check_collision();
    frame += 1;
}

function update_local_input(input) {
    if (local_player == PLAYER.player1) {
        update_player_input(state.player1, input);
    } else {
        update_player_input(state.player2, input);
    }
}


function check_collision() {
    // check collision with two hitboxes
}


function update_player_input(player_enum, input) {
    let player = (player_enum == PLAYER.P1) ? state.player1 : state.player2;
    if (player.punch_frame < 1) {
        if (input == INPUT.PUNCH) {
            player.punch_frame = 18
        } else {
            if (input == INPUT.RIGHT) {
                player.x_pos += 4;
            }
            if (input == INPUT.LEFT) {
                player.x_pos -= 4;
            }
        }
        player.x_pos = Math.max(player.x_pos, boxMin); 
        player.x_pos = Math.min(player.x_pos, boxMax);
        if (player_enum == PLAYER.P1) {
            player.x_pos = Math.min(player.x_pos, state.player2.x_pos-150);
        } else {
            player.x_pos = Math.max(player.x_pos, state.player1.x_pos+150);
        }

    } else {
        player.punch_frame -= 1;
    }
}

function sync () {
    // let temp_state =
    // extract array of inputs from most recent packet
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
  if (canvas.getContext) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 1000, 500);
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
  }
}


const timestep = 1000 / 60; // 1/60fps


fetch("http://localhost:7878", {
  method: "POST",
})
  .then((response) => {
    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text(); // Return a Promise that resolves with the text content
  })
  .then((textContent) => {
    console.log(textContent); // This will log "hello world"
    previous = Date.now();
    requestAnimationFrame(mainLoop);
  })
  .catch((error) => {
    console.error("There was a problem with the fetch operation:", error);
  });



function mainLoop() {
    let current = Date.now();
    let elapsed = current - previous;
    previous = current;
    lag += elapsed;
    // let count = 0;
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
    if (!true_game_over) {
        requestAnimationFrame(mainLoop);
    }
} 


let lag = 0;
let previous = Date.now();


requestAnimationFrame(mainLoop);