if (!window.location.origin.startsWith('https') && !window.location.origin.startsWith('http://localhost')) {
	const a = document.createElement('a');
	a.href = "https://death-arrows.herokuapp.com/"
	a.click()
	a.remove()
}
let ws = new WebSocket(location.origin.replace(/^http/, 'ws'));
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
const byteSpan = document.querySelector(".container .byte")
const pingSpan = document.querySelector(".container .ping");
const highscoreSpan = document.querySelector(".container .highscore")
const playerCircle = document.querySelector(".circle");
const leaveHelp = document.querySelector(".exit")
const helpButton = document.querySelector(".help")
const overlay = document.querySelector(".overlay");
const helpOverlay = document.querySelector("#helpOverlay")
const settings = document.querySelector(".settings");
const mapTitle = document.querySelector(".mapTitle")
const interpolateButton = document.getElementById("interpolation");
const particleButton = document.getElementById("particles");
const fpsButton = document.getElementById("fps");
const saveButton = document.getElementById("saveButton");
let platformMiniSize = 3;
let ping = 10000;
const detectPadding = 150;
let blind = false;
const meter = new FPSMeter(mainDiv, {
    theme: "colorful",
    heat: 1,
    graph: 1,
    history: 20,
    show: 'fps',
    smoothing: 5,
    position: 'absolute'
})
const platformColor = "hsl(192, 54%, 8%)"
let roundTime = 0;
let roundSeconds = 0;
const meterElement = document.querySelector("#gameContainer div")
meterElement.style.position = "absolute"
meterElement.style.left = "1411px"
let config;
let highscore = {
    name: "undefined",
    score: 0
}
if (localStorage.getItem("config") == null) {
    config = {
        interp: true,
        particles: true,
        name: "",
        fps:true,
    };
} else {
    config = JSON.parse(localStorage.getItem("config"));
}
if (config.interp === undefined) {
    config.interp = true;
}
if (config.particles === undefined) {
    config.particles = true;
}
if(config.fps === undefined){
	config.fps = true;
}
if (config.name === undefined) {
    config.name = ""
}
//change the elements so they correspond
if (!config.interp) {
    interpolateButton.classList.remove("yes");
    interpolateButton.classList.add("no");
}
if (!config.particles) {
    particleButton.classList.remove("yes")
    particleButton.classList.add("no")
}
if(!config.fps){
	fpsButton.classList.remove("yes")
	fpsButton.classList.add("no")
    meterElement.style.display = "none";
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
let index;
const menu = document.querySelector(".menu");
const game = document.querySelector(".game");
const play = document.querySelector("a");
let platforms = [];
let rotLeft = false;
let rotRight = false;
let totalBytes = 0;
setInterval(()=>{
   	byteSpan.innerText = `Messages received: ${messages} / per second : ${totalBytes} bytes / per second`
	totalBytes = 0;
	messages = 0;
},1000)
ctx.textAlign = "center";
saveButton.addEventListener("mouseup", (event) => {
    event.preventDefault();
    localStorage.setItem("config", JSON.stringify(config));
    overlay.style.display = "none";
    notMove = false;
});
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
fpsButton.addEventListener("mouseup", (event) => {
	event.preventDefault()
	config.fps = !config.fps;
	if(config.fps) {
		fpsButton.classList.remove("no");
		fpsButton.classList.add("yes");
    	meterElement.style.display = "block";
	} else {
		fpsButton.classList.remove("yes");
		fpsButton.classList.add("no");
   	    meterElement.style.display = "none";
	}
})
particleButton.addEventListener("mouseup", (event) => {
    event.preventDefault();
    config.particles = !config.particles;
    if (config.particles) {
        particleButton.classList.remove("no");
        particleButton.classList.add("yes");
    } else {
        particleButton.classList.remove("yes");
        particleButton.classList.add("no");
    }
});
settings.addEventListener("mouseup", (event) => {
    event.preventDefault();
    overlay.style.display = "flex";
    notMove = true;
});
helpButton.addEventListener("mouseup", (event) => {
    event.preventDefault()
    helpOverlay.style.display = "flex"
    helpOverlay.scrollTop = 0;
    notMove = true;
})
leaveHelp.addEventListener("mouseup", (event) => {
    event.preventDefault()
    helpOverlay.style.display = "none"
    notMove = false;
})
helpOverlay.addEventListener("submit", (event) => event.preventDefault())
overlay.addEventListener("submit", (event) => event.preventDefault())
backButton.addEventListener("mouseup", (event) => {
    event.preventDefault();
    if (notMove) return;
    const payload = {
        type: "back"
    };
    if (ws) ws.send(JSON.stringify(payload));
    menu.style.display = "flex";
    game.style.display = "none";
});

function showMenu(event) {
    const y = Math.round(event.pageY);
    if (y <= 60) {
        menuGame.style.top = "41px";
        menuGame.style.visibility = "visible";
        menuGame.style.zIndex = "300";
    } else {
        menuGame.style.visibility = "hidden";
        menuGame.style.top = "38px";
        menuGame.style.zIndex = "-1";
    }
}
window.addEventListener("beforeunload", () => {
    config.name = (username) ? username : config.username;
    localStorage.setItem("config", JSON.stringify(config))
})
//window.addEventListener("mousemove", showMenu);
let afr;
let username;

function switchMenu() {
    menu.style.display = "none";
    game.style.display = "block";
    const init = () => {
        const payload = {
            type: "join"
        };
        if (ws) ws.send(JSON.stringify(payload));
        if (config.name !== "" && ws) ws.send(JSON.stringify({ type: "chat", value: "/name " + config.name, }))
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
        setInterval(() => {
            ws.send(JSON.stringify({ type: "ping", ts: Date.now() }))
        }, 500)

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
        this.height = initPack.height;
        this.width = initPack.width;
        this.id = initPack.id;
        this.parent = initPack.parent;
        this.around = initPack.around;
        this.states = [{
            x: this.x,
            y: this.y,
            angle: this.angle
        }];
        this.serverState = {
            x: this.x,
            y: this.y,
            angle: this.angle
        };
        arrows[this.id] = this;
        this.currentTime = 0;
    }
    interpolate(delta) {
        if (delta <= 1 / serverTick && config.interp) {
            this.x = lerp(this.x, this.states[0].x, delta * serverTick);
            this.y = lerp(this.y, this.states[0].y, delta * serverTick);
            this.angle = lerp(this.angle, this.states[0].angle, delta * serverTick)
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
            this.states[0].angle = lerp(this.states[0].angle, this.serverState.angle, delta * serverTick)
        } else {
            this.x = this.states[0].x;
            this.y = this.states[0].y;
            this.angle = this.states[0].angle
            this.states[0].x = this.serverState.x;
            this.states[0].y = this.serverState.y;
            this.states[0].angle = this.serverState.angle;
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
        if(x+this.width < -detectPadding || x > canvas.width + detectPadding || y > canvas.height + detectPadding || y + this.height < -detectPadding) {
        	return;
        }
        arrowDraw++;
        //	if(this.around){
        const center = centerRect(this.x, this.y, this.width, this.height, this.angle)
        while (this.currentTime >= 0.009) {
            this.currentTime -= 0.009;
            if (config.particles) {
                //	if(!this.around){
                /*	particles.push(
                		new Particle( center.x, center.y, Math.random() * 6 + 1, "#665578", {
                			x: ( Math.random() - 0.5 ) * ( Math.random() * 25 ),
                			y: ( Math.random() - 0.5 ) * ( Math.random() * 25 )
                		} )
                );*/
                /*		}else{
                			particles.push(
                			new Particle( center.x, center.y, Math.random() * 6 + 1, "rgb(147, 50, 168)", {
                				x: ( Math.random() - 0.5 ) * ( Math.random() * 25 ),
                				y: ( Math.random() - 0.5 ) * ( Math.random() * 25 )
                			}, )
                		);
                }*/
            }
        }
        //	}
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.angle);
        ctx.fillRect(0, 0, this.width, this.height);
        /* ctx.strokeStyle = "black";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(0, 0, this.height, this.width);*/
        ctx.restore();
    }
}
let platformsDraw = 0;
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
        if(x+this.width < -detectPadding || x > canvas.width + detectPadding || y > canvas.height + detectPadding || y + this.height < -detectPadding) {
        	return;
        }
        platformsDraw++;
        ctx.lineWidth = 3;
        /* ctx.fillStyle = `rgb(30,30,30)`;
        ctx.strokeStyle = `rgb(30,30,30)`;*/
        /* ctx.fillStyle = "#212752";
        ctx.strokeStyle = "#212752";*/
        /*ctx.fillStyle = "#455453";
        ctx.strokeStyle = "#455453";*/
        ctx.fillStyle = platformColor;
        ctx.strokeStyle = platformColor;
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
function dist(x1, y1, x2, y2) {
    let a = x2 - x1;
    let b = y2 - y1;
    return Math.sqrt(a * a + b * b)
}

function centerRect(x, y, w, h, radians) {
    let a = { x, y }
    let b = { x: x + (w / 2), y: y + (h / 2) }
    let distance = dist(a.x, a.y, b.x, b.y)
    let angle = Math.atan2(b.y - a.y, b.x - a.x)
    let rx = distance * Math.cos(angle + radians) + a.x
    let ry = distance * Math.sin(angle + radians) + a.y
    return { x: rx, y: ry }
}
let particleDraw = 0;
class Particle {
    constructor(x, y, size, color, velocity) {
        this.x = x
        this.y = y
        //this.radius = radius;
        this.size = size * 2;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
    }
    draw() {
        /*ctx.save();
        ctx.globalAlpha = this.alpha;  ADD THIS LATER, THIS MAKES A SUPER COOL EFFECT */
        //ctx.beginPath();
        const [x, y] = [
            Math.round(this.x - players[selfId].pos.x + canvas.width / 2),
            Math.round(this.y - players[selfId].pos.y + canvas.height / 2)
        ];
         if(x+this.size/2+this.size < -detectPadding || x + this.size/2> canvas.width + detectPadding || y+this.size/2 > canvas.height + detectPadding || y + this.size + this.size/2< -detectPadding) {
        	return;
        }
        particleDraw++;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(x + this.size / 2, y + this.size / 2, this.size, this.size);
        ctx.globalAlpha = 1;
        ctx.restore();
    }
    update(dt) {
        if (config.particles) this.draw();
        this.velocity.x *= Math.pow(0.98, dt * 50);
        this.velocity.y *= Math.pow(0.98, dt * 50);
        this.x += this.velocity.x * dt * 30;
        this.y += this.velocity.y * dt * 30;
        this.alpha -= dt * 1.4;
    }
}
let particles = [];
let lastName = config.name;
let playerDraw = 0;
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
        this.states = [{
            x: this.pos.x,
            y: this.pos.y
        }];
        this.serverState = {
            x: this.pos.x,
            y: this.pos.y,
            rot: this.rot
        };
        this.rotStates = [{
            rot: this.rot
        }];
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
            this.rotStates[0].rot = this.serverState.rot;
        }
    }
    draw(delta) {
        this.currentTime += delta;
        this.interpolate(delta);
        const [x, y] = [
            Math.round(this.pos.x - players[selfId].pos.x + canvas.width / 2),
            Math.round(this.pos.y - players[selfId].pos.y + canvas.height / 2)
        ];
        if(x+this.radius < -detectPadding || x -this.radius> canvas.width + detectPadding|| y -this.radius> canvas.height + detectPadding || y + this.radius < -detectPadding) {
        	return;
        }
        playerDraw++;
        ctx.fillStyle = "#a8a8a8";
        ctx.beginPath();
        ctx.arc(
            x,
            y,
            this.radius + 6,
            0,
            -Math.PI * 2 * (this.cooldowns.arrow.current / this.cooldowns.arrow.max),
            false
        );
        ctx.fill();
        ctx.fillStyle = "hsl(43, 44%, 65%)";
        if (this.place !== undefined) {
            if (this.place === 1) {
                ctx.fillStyle = "hsl(45, 88%, 50%)";
            } else if (this.place === 2) {
                ctx.fillStyle = "hsl(254, 34%, 56%)";
            } else if (this.place === 3) {
                ctx.fillStyle = "hsl(0, 100%, 40%)";
            }
            if (this.id === selfId) {
                if (this.place === 1) {
                    playerCircle.style.backgroundColor = "hsl(45, 88%, 50%)";
                } else if (this.place === 2) {
                    playerCircle.style.backgroundColor = "hsl(254, 34%, 56%)";
                } else if (this.place === 3) {
                    playerCircle.style.backgroundColor = "hsl(0, 100%, 40%)";
                }
            }
        }

        this.color = ctx.fillStyle;
        /*while (this.currentTime >= 0.15) {
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
		}*/
        if (!this.hitWall) this.hitLock = false;
        if (this.hitWall && !this.hitLock && config.particles) {
            for (let i = 0; i < 15; i++) {
                particles.push(
                    new Particle(
                        (this.states[1] !== undefined ?
                            this.states[1].x :
                            this.states[0].x) +
                        Math.random() * 25 -
                        12.5,
                        (this.states[1] !== undefined ?
                            this.states[1].y :
                            this.states[0].y) +
                        Math.random() * 25 -
                        12.5,
                        Math.random() * 3 + 1,
                        platformColor, {
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
            ctx.fillStyle = "hsl(255, 96%, 56%)";
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
afr = window.requestAnimationFrame(render);
let messages = 0;
ws.addEventListener("message", (datas) => {
    const msg = msgpack.decode(new Uint8Array(datas.data));
    messages++;
    totalBytes+= datas.data.byteLength
    if (msg.type === "init") {
        if (msg.selfId) {
            selfId = msg.selfId;
        }
        if (msg.roundTime) {
            roundSeconds = msg.roundTime
        }
        if (msg.serverTick) {
            serverTick = msg.serverTick;
        }
        if (msg.platformSize) {
            platformMiniSize = msg.platformSize;
        }
        if (msg.time && msg.serverTime) {
            roundTime = roundSeconds - (msg.time /*+ (Date.now() - msg.serverTime)*/ ) / 1000
        }
        if (msg.mapTitle) {
            mapTitle.innerText = msg.mapTitle;
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
        if (msg.highscore) {
            highscore = msg.highscore;
            highscoreSpan.innerText = `${highscore.name} : ${highscore.score}`
        }
        if (msg.datas.player && msg.datas.player.length > 0) {
            for (let data of msg.datas.player) {
                new Player(data);
            }
        }
        if (msg.datas.arrow && msg.datas.arrow.length > 0) {
            for (let data of msg.datas.arrow) {
                new Arrow(data);
            }
        }
        if (msg.datas.platforms) {
            console.log("map change")
            platforms = []
            for (let platform of msg.datas.platforms) {
                new Platform(platform.x, platform.y, platform.w, platform.h);
            }
        }
        if (selfId && players[selfId]) updateLeaderboard();
    } else if (msg.type === "update") {
        if (msg.highscore) {
            highscore = msg.highscore;
            highscoreSpan.innerText = `${highscore.name} : ${highscore.score}`
        }
        if (msg.time) {
            roundTime = roundSeconds - (msg.time / 1000)
        }
        if (selfId && msg.datas.player && msg.datas.player.length>0) {
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
                                player.serverState = {
                                    x: data.pos.x,
                                    y: data.pos.y
                                };
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
                                if (selfId && players[selfId]) updateLeaderboard();
                            }
                            if (pastName !== player.username && data.id === selfId) {
                                config.name = player.username;
                            }
                        }
                    }
                }
            }
            if (msg.datas.time) {
                time = msg.datas.time.time / 1000;
            }
            if(msg.datas.arrow && msg.datas.arrow.length > 0){
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
                            } else if (name === "angle") {
                                arrow.serverState.angle = data.angle;
                            } else {
                                arrow[name] = data[name];
                            }
                        }
                    }
                    // arrow.states.push(newState);
                }
            }
        	}
        }
    } else if (msg.type === "remove") {
        for (let data of msg.datas.player) {
            delete players[data];
        }
        if (selfId && players[selfId]) updateLeaderboard();
        for (let {
                id,
                type
            } of msg.datas.arrow) {
            const arrow = arrows[id];
            if (arrow) {
                if (type === "player" && config.particles) {
                    for (let i = 0; i < 500; i++) {
                        const colors = ['#E0E4CC', '#914000', '#ff1c1f', '#ff1c1f', '#ff1c1f', '#ff1c1f', '#ff1c1f', '#ff1c1f', '#ff1c1f', '#ff1c1f', '#ff1c1f', '#ff1c1f', '#ff1c1f', '#ff1c1f', '#ff1c1f', '#F9D423']
                        const color = colors[Math.floor(Math.random() * colors.length)]
                        particles.push(
                            new Particle(
                                arrow.states[1] !== undefined ?
                                arrow.states[1].x :
                                arrow.states[0].x,
                                arrow.states[1] !== undefined ?
                                arrow.states[1].y :
                                arrow.states[0].y,
                                Math.random() * 4 + 1,
                                color, {
                                    x: (Math.random() - 0.5) * (Math.random() * 700),
                                    y: (Math.random() - 0.5) * (Math.random() * 700)
                                }
                            )
                        );
                    }
                } else if (type === "wall" && config.particles) {
                    for (let i = 0; i < 30; i++) {
                        particles.push(
                            new Particle(
                                (arrow.states[1] !== undefined ?
                                    arrow.states[1].x :
                                    arrow.states[0].x) +
                                Math.random() * 50 -
                                25,
                                (arrow.states[1] !== undefined ?
                                    arrow.states[1].y :
                                    arrow.states[0].y) +
                                Math.random() * 50 -
                                25,
                                Math.random() * 3 + 1,
                                platformColor, {
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
    } else if (msg.type === "kick") {
        ws = undefined;
        window.cancelAnimationFrame(afr)
        ctx.fillStyle = "#111";
        ctx.font = "50px Arial";
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white"
        ctx.fillText(
            "You have been kicked by an Administrator.",
            canvas.width / 2,
            canvas.height / 2
        );
    } else if (msg.type === "ping") {
        ping = Math.round((Date.now() - msg.ts) / 2)
        pingSpan.innerText = `Ping: ${ping} ms`
    }else if(msg.type === "blind") {
    	blind = true;
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
        if (ws) ws.send(JSON.stringify(payload));
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
            this.radius <= 0 ?
            0.1 :
            this.radius >= 4 ?
            Math.random() * 1.2 :
            this.radius;
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
    //	ctx.fillStyle = "#bcd1d0";
    ctx.fillStyle = 'rgb(220, 220, 220)'
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
let lastHighscoreString = ""
let arrowDraw = 0;
function render(time) {
    afr = window.requestAnimationFrame(render);
    if(config.fps) meter.tickStart()
    if (!selfId || !players[selfId]) {
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
        gameStart = true;
    }
    username = players[selfId].username
    if (nameSpan.innerText !== players[selfId].username)
        nameSpan.innerText = players[selfId].username;
    const delta = (time - lastTime) / 1000;
    lastTime = time;
    currentTime += delta;
    /*if (time < 60) {
      time += delta;
    }*/
    /*roundTime+=delta;
    if(roundTime <= 0){
    	roundTime = roundSeconds;
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
            if (ws) ws.send(JSON.stringify(payLoad));
        }
        chatHolder.style.display = "none";
        chatBox.value = "";
    }
    //i see what ur doing no rainbow!!!
    //ctx.fillStyle = `rgb(35,35,35)`;
    ctx.fillStyle = "hsl(190, 30%, 30%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawMap();
    /*for (let star of stars) {
      star.draw(delta);
    }*/
    platformsDraw = 0;
    for (let platform of platforms) {
        platform.draw();
    }
   // console.log(`${platformsDraw} platforms on screen, ${platforms.length} total platforms`	)
    particleDraw = 0;
    if(blind) {
    	ctx.save();
        ctx.globalAlpha = 0.05;
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        if (particle.alpha <= 0) {
            particles.splice(i, 1);
            continue;
        } else {
            particle.update(delta);
        }
    }
     //console.log(`${particleDraw} particles on screen, total particles ${particles.length}`)
    ctx.fillStyle = "rgba(39, 55, 73, 0.8)";
    ctx.fillRect(0, 696, 206, 206);
    for (let platform of platforms) {
        ctx.fillStyle = platformColor;
        ctx.beginPath();
        ctx.arc(
            Math.round(platformMiniSize + ((platform.x + platform.width / 2) / arena.x) * 200),
            Math.round(700 - platformMiniSize + ((platform.y + platform.height / 2) / arena.y) * 200),
            platformMiniSize,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
    // i put it at 5 pixels and moved this 5 pixels back and 10 pixels forward so
    //it touch the actual side lmao
    let playerCount = 0;
    playerDraw = 0;
    for (let i of Object.keys(players)) {
        const player = players[i];
        playerCount++;
        if (i === selfId) {
            /* if (rotLeft) player.serverState.rot -= Math.PI * 0.3 * delta;
            if (rotRight) player.serverState.rot += Math.PI * 0.3 * delta;*/
            if (!(3 + (player.pos.x / arena.x) * 200 > 206 || 698 + (player.pos.y / arena.y) * 200 < 696)) {
                ctx.fillStyle = "black";
                ctx.beginPath();
                ctx.arc(
                    Math.round(3 + (player.pos.x / arena.x) * 200),
                    Math.round(698 + (player.pos.y / arena.y) * 200),
                    3,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
            /*if(clientKeys[0]) player.serverState.y -= 2 * delta;
            if(clientKeys[1]) player.serverState.y += 2 * delta;
            if(clientKeys[2]) player.serverState.x -= 2 * delta;
            if(clientKeys[3]) player.serverState.x += 2 * delta;*/
        }
        player.draw(delta);
    }
    //console.log(`${playerDraw} on screen, ${playerCount} total players`)
    arrowDraw = 0;
    let arrowCount = 0;
    for (let i of Object.keys(arrows)) {
        const arrow = arrows[i];
        arrowCount++;
        ctx.fillStyle = "hsl(43, 28%, 70%)";
        if (!players[arrow.parent]) {
            arrow.draw(delta);
            continue;
        }
        if (players[arrow.parent].place !== undefined) {
            const place = players[arrow.parent].place;
            if (place === 1) {
                ctx.fillStyle = "hsl(43, 90%, 67%)";
            } else if (place === 2) {
                ctx.fillStyle = "hsl(202, 52%, 66%)";
            } else if (place === 3) {
                ctx.fillStyle = "rgb(254, 81, 81)";
            }
        }
        arrow.draw(delta);
    }
    //console.log(`${arrowDraw} arrow on screen, ${arrowCount} total arrows`)
    ctx.fillStyle = "black";
   /* ctx.font = "20px Verdana, Geneva, sans-serif";
    ctx.fillText("Ping: " + ping + "ms", 80, 80);*/
    ctx.font = "40px Verdana, Geneva, sans-serif";
    /*ctx.fillStyle = "red";
    ctx.fillRect(1600 / 2 - 50, 0, 100, 60);
    ctx.fillStyle = "black";
    ctx.fillText(Math.round(time / 1000), 1600 / 2, 40);*/
    ctx.fillStyle = "rgba(22, 54, 90, 0.68)";
    ctx.fillRect(1275, 50, 300, lbPlayers.length * 40 + 15 + 80);
    //lbPlayers.sort((a, b) => b.kills - a.kills);
    lbPlayers = lbPlayers.slice(0, 4);
    ctx.font = "30px Verdana, Geneva, sans-serif";
    for (let i of Object.keys(lbPlayers)) {
        ctx.textAlign = "left";
        if (lbPlayers[i].type === "Other") ctx.fillStyle = "black";
        else {
            ctx.fillStyle = "white";
        }
        ctx.font = "25px Verdana, Geneva, sans-serif";
        if (lbPlayers[i].type !== "YouLol") {
            let p = parseInt(i, 10) + 1;
            ctx.fillText(
                p + ". " + lbPlayers[i].name + ": " + lbPlayers[i].kills,
                1290,
                150 + i * 50
            );
        } else {
            ctx.fillStyle = "white";
            ctx.fillText(
                index + ". " + lbPlayers[i].name + ": " + lbPlayers[i].kills,
                1290,
                150 + i * 50
            );
        }
        ctx.textAlign = "center";
    }
    ctx.font = "25px Verdana, Geneva, sans-serif";
    ctx.fillStyle = "white";
    ctx.fillText(`Players Online: ${playerCount}`, 1275 + 300 / 2, 90);
    ctx.strokeStyle = "rgb(0, 0, 0)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1275, 110);
    ctx.lineTo(1575, 110);
    ctx.stroke();
    ctx.lineWidth = 1;
    const superCooldown = players[selfId].cooldowns.super;
    ctx.fillStyle = superCooldown.current <= 0 ? "rgb(240, 132, 0)" : "rgb(44, 48, 246)";
    ctx.fillRect(canvas.width / 2 - 100, canvas.height - 50, 200, 50);
    ctx.fillStyle = "rgba(232, 3, 36,0.5)";
    ctx.fillRect(
        canvas.width / 2 - 100,
        canvas.height,
        200,
        -50 * (superCooldown.current / superCooldown.max)
    );
    ctx.fillStyle="white"
    ctx.strokeStyle="black"
    ctx.lineWidth = 1;
    ctx.beginPath()
    ctx.moveTo(canvas.width/2-80,0)
    ctx.lineTo(canvas.width/2-40,50)
    ctx.lineTo(canvas.width/2+40,50)
    ctx.lineTo(canvas.width/2+80,0)
    ctx.fill()
    ctx.stroke()
    ctx.closePath()
    	ctx.fillStyle = "black"
    ctx.fillText(convert(roundTime), canvas.width / 2, 30)
   // ctx.fillText(`${byteLength} bytes`, canvas.width - 100, canvas.height - 30)
   if(config.fps) meter.tick()
}
const convert = (seconds) => {
    let minutes = Math.floor(seconds / 60);
    seconds = Math.round(seconds - minutes * 60)
    if (seconds < 10) {
        seconds = "0" + seconds;
    }
    return String(minutes) + ":" + String(seconds);
}

function lerp(start, end, time) {
    return start * (1 - time) + end * time;
}