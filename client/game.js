const ws = new WebSocket("wss://arrows.zerotixdev.repl.co");
ws.binaryType = "arraybuffer";
let players = Object.create(null);
let arrows = Object.create(null);
let keys = new Array(8).fill(false);
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const chatBox = document.getElementById("chatBox");
const chatHolder = document.getElementById("chatHolder");
const mainDiv = document.querySelector("#gameContainer");
const menuDiv = document.querySelector("#menuContainer");
const menuGame = document.querySelector(".container nav");
const backButton = document.querySelector(".back");
const nameSpan = document.querySelector(".name");
const playerCircle = document.querySelector(".circle");
const overlay = document.querySelector(".overlay");
const settings = document.querySelector(".settings");
const interpolateButton = document.getElementById("interpolation");
const saveButton = document.getElementById("saveButton");
let config;
if (localStorage.getItem("config") == null) {
  config = { interp: true };
} else {
  config = JSON.parse(localStorage.getItem("config"));
}
if (config.interp === undefined) {
  config.interp = true;
}
//change the elements so they correspond
if (!config.interp) {
  interpolateButton.classList.remove("yes");
  interpolateButton.classList.add("no");
}
const images = {
  winter: new Image(),
  spring: new Image(),
  santa: new Image()
};
let serverTick;
let lbPlayers = [];
images.winter.src = "./graphics/winter-wreath.png";
images.spring.src = "./graphics/spring-wreath.png";
images.santa.src = "./graphics/santa-hat.png";
let arena = null;
let scale = 0;
let selfId = null;
let time = 0;
var h = 0;
let index;
const menu = document.querySelector(".menu");
const game = document.querySelector(".game");
const play = document.querySelector("a");
const platforms = [];
let rotLeft = false;
let rotRight = false;
ctx.textAlign = "center";
saveButton.addEventListener("mouseup", (event) => {
  event.preventDefault();
  localStorage.setItem("config", JSON.stringify(config));
  overlay.style.display = "none";
  notMove = false;
});
window.addEventListener("beforeunload", () => {});
interpolateButton.addEventListener("mouseup", (event) => {
  event.preventDefault();
  config.interp = !config.interp;
  if (config.interp) {
    interpolateButton.classList.remove("no");
    interpolateButton.classList.add("yes");
  } else {
    interpolateButton.classList.remove("yes");
    interpolateButton.classList.add("no");
  }
});
settings.addEventListener("mouseup", (event) => {
  event.preventDefault();
  overlay.style.display = "flex";
  notMove = true;
});
backButton.addEventListener("mouseup", (event) => {
  event.preventDefault();
  const payload = {
    type: "back"
  };
  ws.send(JSON.stringify(payload));
  menu.style.display = "flex";
  game.style.display = "none";
});
function showMenu(event) {
  const y = Math.round(event.pageY);
  if (y <= 60) {
    menuGame.style.top = "41px";
    menuGame.style.visibility = "visible";
    menuGame.style.zIndex = "300";
    console.log("up");
  } else {
    menuGame.style.visibility = "hidden";
    menuGame.style.top = "38px";
    menuGame.style.zIndex = "-1";
  }
}
//window.addEventListener("mousemove", showMenu);
function switchMenu() {
  menu.style.display = "none";
  game.style.display = "block";
  const init = () => {
    const payload = {
      type: "join"
    };
    ws.send(JSON.stringify(payload));
    window.addEventListener("keydown", trackKeys);
    window.addEventListener("keyup", trackKeys);
    canvas.addEventListener("mousemove", (event) => {
      let rect = canvas.getBoundingClientRect();
      // const x = Math.round((event.pageX - rect.left) / scale);
      const y = Math.round((event.pageY - rect.top) / scale);
      if (y <= 60) {
        menuGame.style.top = "41px";
        menuGame.style.visibility = "visible";
        menuGame.style.zIndex = "300";
      } else {
        menuGame.style.visibility = "hidden";
        menuGame.style.top = "38px";
        menuGame.style.zIndex = "-1";
      }
    });
  };
  try {
    init();
  } catch {
    ws.addEventListener("open", () => {
      init();
    });
  }
}
function updateLeaderboard() {
  lbPlayers = [];
  for (let i of Object.keys(players)) {
    let type = "Other";
    if (i === selfId) {
      type = "You";
    }
    lbPlayers.push({
      name: players[i].username,
      kills: players[i].kills,
      type: type,
      id: i
    });
  }
  lbPlayers.sort((a, b) => b.kills - a.kills);
  index = lbPlayers.findIndex((e) => e.id === selfId) + 1;
  lbPlayers = lbPlayers.slice(0, 3);
  let place = 0;
  for (let i of Object.keys(players)) {
    players[i].place = undefined;
  }
  for (let player of lbPlayers) {
    place++;
    players[player.id].place = place;
  }
  if (!lbPlayers.find((e) => e.type === "You")) {
    lbPlayers.push({
      name: players[selfId].username,
      kills: players[selfId].kills,
      type: "YouLol",
      id: selfId
    });
  }
}
play.addEventListener("mouseup", switchMenu);
ctx.textAlign = "center";
ctx.font = "20px Verdana, Geneva, sans-serif";
let chatlock = false;
let byteLength = 0;
let enterPressed = false;
let notMove = false;
class Arrow {
  constructor(initPack) {
    this.x = initPack.x;
    this.y = initPack.y;
    this.angle = initPack.angle;
    this.life = initPack.life;
    this.height = initPack.height;
    this.width = initPack.width;
    this.id = initPack.id;
    this.parent = initPack.parent;
    this.states = [{ x: this.x, y: this.y }];
    this.serverState = { x: this.x, y: this.y };
    arrows[this.id] = this;
    this.currentTime = 0;
  }
  interpolate(delta) {
    if (delta <= 1 / serverTick && config.interp) {
      this.x = lerp(this.x, this.states[0].x, delta * serverTick);
      this.y = lerp(this.y, this.states[0].y, delta * serverTick);
      this.states[0].x = lerp(
        this.states[0].x,
        this.serverState.x,
        delta * serverTick
      );
      this.states[0].y = lerp(
        this.states[0].y,
        this.serverState.y,
        delta * serverTick
      );
    } else {
      this.x = this.states[0].x;
      this.y = this.states[0].y;
      this.states[0].x = this.serverState.x;
      this.states[0].y = this.serverState.y;
    }
    // console.log(this.x + "x",this.states[0].x + "states x",this.serverState.x + "server x")
  }
  draw(delta) {
    this.currentTime += delta;
    this.interpolate(delta);
    const [x, y] = [
      Math.round(this.x - players[selfId].pos.x + canvas.width / 2),
      Math.round(this.y - players[selfId].pos.y + canvas.height / 2)
    ];
    while (this.currentTime >= 0.009) {
      this.currentTime -= 0.009;
      particles.push(
        new Particle(this.x, this.y, Math.random() * 6 + 1, "#665578", {
          x: (Math.random() - 0.5) * (Math.random() * 25),
          y: (Math.random() - 0.5) * (Math.random() * 25)
        })
      );
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.angle);
    ctx.fillRect(0, 0, this.height, this.width);
    /* ctx.strokeStyle = "black";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, this.height, this.width);*/
    ctx.restore();
  }
}
class Platform {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    platforms.push(this);
  }
  draw() {
    const [x, y] = [
      Math.round(this.x - players[selfId].pos.x + canvas.width / 2),
      Math.round(this.y - players[selfId].pos.y + canvas.height / 2)
    ];
    ctx.lineWidth = 3;
    /* ctx.fillStyle = `rgb(30,30,30)`;
    ctx.strokeStyle = `rgb(30,30,30)`;*/
    /* ctx.fillStyle = "#212752";
    ctx.strokeStyle = "#212752";*/
    ctx.fillStyle = "#455453";
    ctx.strokeStyle = "#455453";
    ctx.fillRect(x, y, this.width, this.height);
    ctx.strokeRect(x, y, this.width, this.height);
  }
}
/*class Particle {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.angle = Math.random() * Math.PI * 2;
    this.xv = Math.cos(this.angle);
  }
}*/
class Particle {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
    this.alpha = 1;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    const [x, y] = [
      Math.round(this.x - players[selfId].pos.x + canvas.width / 2),
      Math.round(this.y - players[selfId].pos.y + canvas.height / 2)
    ];
    ctx.arc(x, y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  update(dt) {
    this.draw();
    this.velocity.x *= Math.pow(0.98, dt * 50);
    this.velocity.y *= Math.pow(0.98, dt * 50);
    this.x += this.velocity.x * dt * 30;
    this.y += this.velocity.y * dt * 30;
    this.alpha -= dt * 1.4;
  }
}
let particles = [];
class Player {
  constructor(initPack) {
    this.pos = initPack.pos;
    this.radius = initPack.radius;
    this.id = initPack.id;
    this.username = initPack.username;
    this.chatTime = initPack.chatTime;
    this.chatMsg = initPack.chatMsg;
    this.rot = initPack.rot;
    this.arrowState = initPack.arrowState;
    this.arrowForce = initPack.arrowForce;
    this.maxForce = initPack.maxForce;
    this.kills = initPack.kills;
    this.hitWall = initPack.hitWall;
    this.hitLock = false;
    this.cooldowns = initPack.cooldowns;
    this.states = [{ x: this.pos.x, y: this.pos.y }];
    this.serverState = {
      x: this.pos.x,
      y: this.pos.y,
      rot: this.rot
    };
    this.rotStates = [{ rot: this.rot }];
    this.place = undefined;
    this.color = undefined;
    players[this.id] = this;
    this.currentTime = 0;
  }
  interpolate(delta) {
    if (delta <= 1 / serverTick && config.interp) {
      this.pos.x = lerp(this.pos.x, this.states[0].x, delta * serverTick);
      this.pos.y = lerp(this.pos.y, this.states[0].y, delta * serverTick);
      this.rot = lerp(this.rot, this.rotStates[0].rot, delta * serverTick);
      this.states[0].x = lerp(
        this.states[0].x,
        this.serverState.x,
        delta * serverTick
      );
      this.states[0].y = lerp(
        this.states[0].y,
        this.serverState.y,
        delta * serverTick
      );
      this.rotStates[0].rot = lerp(
        this.rotStates[0].rot,
        this.serverState.rot,
        delta * serverTick
      );
    } else {
      this.pos.x = this.states[0].x;
      this.pos.y = this.states[0].y;
      this.rot = this.rotStates[0].rot;
      this.states[0].x = this.serverState.x;
      this.states[0].y = this.serverState.y;
    }
  }
  draw(delta) {
    this.currentTime += delta;
    this.interpolate(delta);
    const [x, y] = [
      Math.round(this.pos.x - players[selfId].pos.x + canvas.width / 2),
      Math.round(this.pos.y - players[selfId].pos.y + canvas.height / 2)
    ];
    ctx.fillStyle = "#bababa";
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      this.radius + 5,
      0,
      -Math.PI * 2 * (this.cooldowns.arrow.current / this.cooldowns.arrow.max),
      false
    );
    ctx.fill();
    ctx.fillStyle = "#b8ad91";
    if (this.place !== undefined) {
      if (this.place === 1) {
        ctx.fillStyle = "#e3b21e";
      } else if (this.place === 2) {
        ctx.fillStyle = "#857ca2";
      } else if (this.place === 3) {
        ctx.fillStyle = "#c40606";
      }
      if (this.id === selfId) {
        if (this.place === 1) {
          playerCircle.style.backgroundColor = "#e3b21e";
        } else if (this.place === 2) {
          playerCircle.style.backgroundColor = "#857ca2";
        } else if (this.place === 3) {
          playerCircle.style.backgroundColor = "#c40606";
        }
      }
    }

    this.color = ctx.fillStyle;
    while (this.currentTime >= 0.15) {
      this.currentTime -= 0.15;
      particles.push(
        new Particle(
          this.pos.x + Math.random() * 50 - 25,
          this.pos.y + Math.random() * 50 - 25,
          Math.random() * 6 + 1,
          this.color,
          {
            x: (Math.random() - 0.5) * (Math.random() * 15),
            y: (Math.random() - 0.5) * (Math.random() * 15)
          }
        )
      );
    }
    if (!this.hitWall) this.hitLock = false;
    if (this.hitWall && !this.hitLock) {
      for (let i = 0; i < 15; i++) {
        particles.push(
          new Particle(
            (this.states[1] !== undefined
              ? this.states[1].x
              : this.states[0].x) +
              Math.random() * 25 -
              12.5,
            (this.states[1] !== undefined
              ? this.states[1].y
              : this.states[0].y) +
              Math.random() * 25 -
              12.5,
            Math.random() * 3 + 1,
            "#161c40",
            {
              x: (Math.random() - 0.5) * (Math.random() * 10),
              y: (Math.random() - 0.5) * (Math.random() * 10)
            }
          )
        );
      }
      this.hitLock = true;
    }
    /*ctx.shadowColor = this.color;
    ctx.shadowBlur = 105;*/
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    //ctx.shadowBlur = 0;
    if (this.cooldowns.spawn.current >= 0.001) {
      ctx.fillStyle = "rgba(118, 0, 222,0.4)";
      ctx.beginPath();
      ctx.arc(x, y, this.radius + 15, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.place !== undefined) {
      if (this.place === 1) {
        //spring wreath
        ctx.drawImage(images.spring, x - 40, y - 55, 80, 80);
        /* ctx.fillStyle = "#6b5714";
        ctx.font = "15px Verdana, Geneva, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("MUDA", x, y);
        ctx.textBaseline = "alphabetic";*/
      } else if (this.place === 2) {
        //winter wreath
        ctx.drawImage(images.winter, x - 40, y - 55, 80, 80);
      } else if (this.place === 3) {
        //santa hat
        ctx.drawImage(images.santa, x - 41, y - 34, 80, 80);
      }
    }
    ctx.lineWidth = 0.3;
    ctx.font = "30px Verdana, Geneva, sans-serif";
    if (this.place !== undefined && this.place === 2) {
      ctx.fillStyle = "#6a45d9";
    }
    ctx.fillText(this.username, x, Math.round(y + this.radius * 2));
    // ctx.strokeStyle = "black";
    // ctx.strokeText(this.username, x, Math.round(y + this.radius * 2));
    ctx.font = "40px Arial, Geneva, sans-serif";
    ctx.fillStyle = "black";
    // ctx.fillText(this.kills, x, y + 13);
    if (this.arrowState) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(this.rot);
      ctx.fillStyle = "white";
      if (this.arrowForce > this.maxForce - 50) {
        ctx.fillStyle = "#140000";
      }
      ctx.fillRect(-1, 0, 2, 80);
      ctx.restore();
    }
    if (this.chatTime > 0) {
      ctx.font = "20px Verdana, Geneva, sans-serif";
      ctx.fillStyle = `rgb(50, 50, 50, ${this.chatTime / 0.5})`;
      const width = ctx.measureText(this.chatMsg).width;
      ctx.fillRect(
        Math.round(x - width / 2 - 3),
        Math.round(y - 63),
        Math.round((width * 2) / 2 + 6),
        30
      );
      ctx.fillStyle = `rgb(200, 200, 200, ${this.chatTime / 0.5})`;
      ctx.fillText(this.chatMsg, x, Math.round(y - this.radius - 15));
    }
  }
}
const scaleNumber = 0.9;
function resize() {
  let winw = window.innerWidth;
  let winh = window.innerHeight;
  let xvalue = winw / canvas.width;
  let yvalue = winh / canvas.height;
  scale = xvalue * scaleNumber;
  if (yvalue < xvalue) {
    scale = yvalue * scaleNumber;
  }
  canvas.style.transform = "scale(" + scale + ")";
  canvas.style.left = (winw - canvas.width) / 2 + "px";
  canvas.style.top = (winh - canvas.height) / 2 + "px";
  mainDiv.style.transform = "scale(" + scale / scaleNumber + ")";
  mainDiv.style.left = (winw - canvas.width) / 2 + "px";
  mainDiv.style.top = (winh - canvas.height) / 2 + "px";
  menuDiv.style.transform = "scale(" + scale / scaleNumber + ")";
  menuDiv.style.left = (winw - canvas.width) / 2 + "px";
  menuDiv.style.top = (winh - canvas.height) / 2 + "px";
}
resize();
window.addEventListener("resize", resize);
window.requestAnimationFrame(render);
ws.addEventListener("message", (datas) => {
  const msg = msgpack.decode(new Uint8Array(datas.data));
  byteLength = datas.data.byteLength;
  if (msg.type === "init") {
    if (msg.selfId) {
      selfId = msg.selfId;
    }
    if (msg.serverTick) {
      serverTick = msg.serverTick;
    }
    if (msg.arena) {
      arena = msg.arena;
      /*let colorRange = [0, 60, 240];
      for (let i = 0; i < 400; i++) {
        let x = getRandom(-arena.x, arena.x * 2),
          y = getRandom(-arena.y, arena.y * 2),
          radius = Math.random() * 1.2,
          hue = colorRange[getRandom(0, colorRange.length - 1)],
          sat = getRandom(50, 100);
        stars.push(
          new Star(x, y, radius, "hsl(" + hue + ", " + sat + "%, 88%)")
        );
      }*/
    }
    if (msg.datas.player.length > 0) {
      for (let data of msg.datas.player) {
        new Player(data);
      }
    }
    if (msg.datas.arrow.length > 0) {
      for (let data of msg.datas.arrow) {
        new Arrow(data);
      }
    }
    if (msg.datas.platforms) {
      for (let platform of msg.datas.platforms) {
        new Platform(platform.x, platform.y, platform.w, platform.h);
      }
    }
    updateLeaderboard();
  } else if (msg.type === "update") {
    if (selfId) {
      for (let data of msg.datas.player) {
        const player = players[data.id];
        if (player) {
          for (let name in data) {
            if (name === "id") continue;
            if (data[name] !== undefined) {
              let past;
              let pastName;
              if (name === "kills") {
                past = player.kills;
              }
              if (name === "username") {
                pastName = player.username;
              }
              if (name === "pos") {
                /*if (player.states.length === 2) player.states.shift();
                player.states.push({
                  x: data.pos.x,
                  y: data.pos.y
                });*/
                player.serverState = { x: data.pos.x, y: data.pos.y };
              } else {
                if (name === "rot") {
                  /* if (player.rotStates.length === 2) player.rotStates.shift();
                  player.rotStates.push({
                    rot: data.rot
                  });*/
                  player.serverState.rot = data.rot;
                }
              }
              if (name !== "rot" && name !== "pos") {
                player[name] = data[name];
              }
              if (
                (name === "kills" && past !== player.kills) ||
                (name === "username" && pastName !== player.username)
              ) {
                // update leaderboard
                updateLeaderboard();
              }
            }
          }
        }
      }
      if (msg.datas.time) {
        time = msg.datas.time.time / 1000;
      }
      for (let data of msg.datas.arrow) {
        const arrow = arrows[data.id];
        if (arrow) {
          //const newState = {};
          for (let name in data) {
            if (name === "id") continue;
            if (data[name] !== undefined) {
              if (name === "x") {
                //newState.x = data.x;
                arrow.serverState.x = data.x;
              } else if (name === "y") {
                // newState.y = data.y;
                arrow.serverState.y = data.y;
              } else {
                arrow[name] = data[name];
              }
            }
          }
          // arrow.states.push(newState);
        }
      }
    }
  } else if (msg.type === "remove") {
    for (let data of msg.datas.player) {
      delete players[data];
    }
    updateLeaderboard();
    for (let { id, type } of msg.datas.arrow) {
      const arrow = arrows[id];
      if (arrow) {
        if (type === "player") {
          for (let i = 0; i < 120; i++) {
            particles.push(
              new Particle(
                arrow.states[1] !== undefined
                  ? arrow.states[1].x
                  : arrow.states[0].x,
                arrow.states[1] !== undefined
                  ? arrow.states[1].y
                  : arrow.states[0].y,
                Math.random() * 6 + 1,
                "red",
                {
                  x: (Math.random() - 0.5) * (Math.random() * 25),
                  y: (Math.random() - 0.5) * (Math.random() * 25)
                }
              )
            );
          }
        } else if (type === "wall") {
          for (let i = 0; i < 50; i++) {
            particles.push(
              new Particle(
                (arrow.states[1] !== undefined
                  ? arrow.states[1].x
                  : arrow.states[0].x) +
                  Math.random() * 50 -
                  25,
                (arrow.states[1] !== undefined
                  ? arrow.states[1].y
                  : arrow.states[0].y) +
                  Math.random() * 50 -
                  25,
                Math.random() * 5 + 1,
                "#212752",
                {
                  x: (Math.random() - 0.5) * (Math.random() * 25),
                  y: (Math.random() - 0.5) * (Math.random() * 25)
                }
              )
            );
          }
        }
      }
      delete arrows[id];
    }
  }
});
function trackKeys(event) {
  if (event.repeat) return;
  if (event.keyCode === 87) {
    keys[0] = event.type === "keydown";
  } else if (event.keyCode === 83) {
    keys[1] = event.type === "keydown";
  } else if (event.keyCode === 65) {
    keys[2] = event.type === "keydown";
  } else if (event.keyCode === 68) {
    keys[3] = event.type === "keydown";
  } else {
    const newIndex = [37, 39].findIndex((e) => e === event.keyCode);
    if (newIndex > -1) {
      keys[4 + newIndex] = event.type === "keydown";
      if (4 + newIndex === 4) rotLeft = event.type === "keydown";
      else if (4 + newIndex === 5) rotRight = event.type === "keydown";
    }
  }
  if (event.keyCode === 90 || event.keyCode === 16) {
    keys[6] = event.type === "keydown";
  }
  if (event.keyCode === 32) {
    keys[7] = event.type === "keydown";
  }
  if (event.keyCode === 13) enterPressed = event.type === "keydown";
  if (!notMove) {
    const payload = {
      type: "keyUpdate",
      keys: keys
    };
    ws.send(JSON.stringify(payload));
  }
}
let stars = [];
class Star {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.iter = Math.random() * 150;
    this.change = Math.random() * 3 + 1;
  }
  draw(delta) {
    this.radius += Math.random() - 0.5;
    this.radius =
      this.radius <= 0
        ? 0.1
        : this.radius >= 4
        ? Math.random() * 1.2
        : this.radius;
    this.iter += delta;
    if (this.iter >= this.change) {
      this.x = getRandom(-arena.x, arena.x * 2);
      this.y = getRandom(-arena.y, arena.y * 2);
      this.iter = 0;
      this.radius = Math.random() * 1.2;
    }
    const [x, y] = [
      Math.round(this.x - players[selfId].pos.x + canvas.width / 2),
      Math.round(this.y - players[selfId].pos.y + canvas.height / 2)
    ];
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, 360);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}
function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function drawMap() {
  const x = Math.round(canvas.width / 2 - players[selfId].pos.x);
  const y = Math.round(canvas.height / 2 - players[selfId].pos.y);
  // ctx.fillStyle = "rgb(200, 200, 200)";
  // ctx.fillStyle = "#5a5e63";
  ctx.fillStyle = "#bcd1d0";
  //arena color
  ctx.fillRect(x, y, arena.x, arena.y);
  /* const sizeX = arena.x / 2;
  const sizeY = arena.y / 2;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.strokeStyle = "rgb(160,160,160)";
      ctx.lineWidth = 5;
      ctx.strokeRect(x + sizeX * i, y + sizeY * j, sizeX, sizeY);
    }
  } */
}
let lastTime = 0;
let initial = 0;
let currentTime = 0;
function render(time) {
  window.requestAnimationFrame(render);
  if (!players[selfId]) {
    ctx.fillStyle = "white";
    ctx.font = "50px Arial";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText(
      "Connecting to Server...",
      canvas.width / 2,
      canvas.height / 2
    );
    return;
  }
  if (!initial) {
    updateLeaderboard();
    initial = 1;
  }
  if (nameSpan.innerText !== players[selfId].username)
    nameSpan.innerText = players[selfId].username;
  const delta = (time - lastTime) / 1000;
  lastTime = time;
  currentTime += delta;
  /*if (time < 60) {
    
    time += delta;
  }*/

  if (enterPressed && !chatlock) {
    notMove = !notMove;
    chatlock = true;
  }
  if (!enterPressed) {
    chatlock = false;
  }
  if (notMove) {
    chatHolder.style.display = "block";
    chatBox.focus();
  } else {
    if (chatBox.value !== "" && chatBox.value !== "/") {
      const payLoad = {
        type: "chat",
        value: chatBox.value
      };
      ws.send(JSON.stringify(payLoad));
    }
    chatHolder.style.display = "none";
    chatBox.value = "";
  }
  //i see what ur doing no rainbow!!!
  //ctx.fillStyle = `rgb(35,35,35)`;
  ctx.fillStyle = "#0c5753";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawMap();
  /*for (let star of stars) {
    star.draw(delta);
  }*/
  for (let platform of platforms) {
    platform.draw();
  }
  /* for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    if (particle.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    } else {
      particle.update(delta);
    }
  }*/
  ctx.fillStyle = "rgba(39, 55, 73, 0.68)";
  ctx.fillRect(45, 645, 210, 210);
  // i put it at 5 pixels and moved this 5 pixels back and 10 pixels forward so
  //it touch the actual side lmao
  let playerCount = 0;
  for (let i of Object.keys(players)) {
    const player = players[i];
    playerCount++;
    if (i === selfId) {
      /* if (rotLeft) player.serverState.rot -= Math.PI * 0.3 * delta;
      if (rotRight) player.serverState.rot += Math.PI * 0.3 * delta;*/
      ctx.fillStyle = "#dba400";
      if (player.place !== undefined && player.place === 1) {
        ctx.fillStyle = "#0f0d06";
      }
      ctx.beginPath();
      ctx.arc(
        Math.round(50 + (player.pos.x / arena.x) * 200),
        Math.round(650 + (player.pos.y / arena.y) * 200),
        5,
        0,
        Math.PI * 2
      );
      ctx.fill();
      /*if(clientKeys[0]) player.serverState.y -= 2 * delta;
      if(clientKeys[1]) player.serverState.y += 2 * delta;
      if(clientKeys[2]) player.serverState.x -= 2 * delta;
      if(clientKeys[3]) player.serverState.x += 2 * delta;*/
    }
    player.draw(delta);
  }
  for (let i of Object.keys(arrows)) {
    const arrow = arrows[i];

    ctx.fillStyle = "#bdb7a8";
    if (!players[arrow.parent]) {
      arrow.draw(delta);
      continue;
    }
    if (players[arrow.parent].place !== undefined) {
      const place = players[arrow.parent].place;
      if (place === 1) {
        ctx.fillStyle = "#dec27a";
      } else if (place === 2) {
        ctx.fillStyle = "#91aebf";
      } else if (place === 3) {
        ctx.fillStyle = "#cc7878";
      }
    }
    arrow.draw(delta);
  }
  ctx.fillStyle = "rgb(255, 255, 255)";
  ctx.font = "20px Verdana, Geneva, sans-serif";
  ctx.fillText(byteLength + " bytes", 1530, 880);
  ctx.font = "40px Verdana, Geneva, sans-serif";
  /*ctx.fillStyle = "red";
  ctx.fillRect(1600 / 2 - 50, 0, 100, 60);
  ctx.fillStyle = "black";
  ctx.fillText(Math.round(time / 1000), 1600 / 2, 40);*/
  ctx.fillStyle = "rgba(39, 55, 73, 0.68)";
  ctx.fillRect(1150, 40, 400, lbPlayers.length * 30 + 15 + 40);
  //lbPlayers.sort((a, b) => b.kills - a.kills);
  lbPlayers = lbPlayers.slice(0, 4);
  ctx.font = "30px Verdana, Geneva, sans-serif";
  for (let i of Object.keys(lbPlayers)) {
    ctx.textAlign = "left";
    if (lbPlayers[i].type === "Other") ctx.fillStyle = "#c73636";
    else {
      ctx.fillStyle = "#03170d";
    }
    ctx.font = "25px Verdana, Geneva, sans-serif";
    if (lbPlayers[i].type !== "YouLol") {
      let p = parseInt(i, 10) + 1;
      ctx.fillText(
        p + ". " + lbPlayers[i].name + ": " + lbPlayers[i].kills,
        1160,
        110 + i * 30
      );
    } else {
      ctx.fillStyle = "#03170d";
      ctx.fillText(
        index + ". " + lbPlayers[i].name + ": " + lbPlayers[i].kills,
        1160,
        110 + i * 30
      );
    }
    ctx.textAlign = "center";
  }

  ctx.font = "25px Verdana, Geneva, sans-serif";
  ctx.fillStyle = "#e802a3";
  ctx.fillText(`Players Online: ${playerCount}`, 1350, 70);
  ctx.strokeStyle = "rgb(0, 0, 0)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(1150, 80);
  ctx.lineTo(1550, 80);
  ctx.stroke();
  ctx.lineWidth = 1;
  const superCooldown = players[selfId].cooldowns.super;
  ctx.fillStyle = superCooldown.current <= 0 ? "#3337f2" : "#4f52d6";
  ctx.fillRect(canvas.width / 2 - 100, canvas.height - 50, 200, 50);
  ctx.fillStyle = "rgba(6, 3, 6,0.6)";
  ctx.fillRect(
    canvas.width / 2 - 100,
    canvas.height,
    200,
    -50 * (superCooldown.current / superCooldown.max)
  );
}
function lerp(start, end, time) {
  return start * (1 - time) + end * time;
}
