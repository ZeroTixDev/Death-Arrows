const Vector = require("./vector");
var randomConso = function () {
  let index = Math.round(Math.random() * 20);
  let consos = [
    "b",
    "c",
    "d",
    "f",
    "g",
    "h",
    "j",
    "k",
    "l",
    "m",
    "n",
    "p",
    "q",
    "r",
    "s",
    "t",
    "v",
    "w",
    "x",
    "y",
    "z"
  ];
  return consos[index];
};
var randomVowel = function () {
  let index = Math.round(Math.random() * 4);
  let vowels = ["a", "e", "i", "o", "u"];
  return vowels[index];
};
class Cooldown {
  constructor(current, max) {
    this.current = current;
    this.max = max;
  }
  update(delta) {
    this.current -= delta;
    if (this.current <= 0) {
      this.current = 0;
    }
  }
}
module.exports = class Player {
  constructor(id, pos = new Vector(0, 0), keys = []) {
    this.id = id;
    this.pos = pos;
    this.keys = keys;
    this.vel = new Vector(0, 0);
    this.maxSpd = 375;
		this.accel = 5000;
    this.radius = 25; //lol
    this.chatMsg = "Hello";
    this.chatTime = 5;
    this.arrowState = false;
    this.kills = 0;
    this.pendingKeys = [false, false, false, false];
    this.rot = 0;
    /* this.cooldown = 1.5; //seconds
    //just test
    this.currentCooldown = 1.5;*/
    this.cooldowns = {
      arrow: new Cooldown(1, 1.5),
      super: new Cooldown(5, 30), //No let me test, I wanna see how laggy it get
      spawn: new Cooldown(3, 3)
    };
    this.arrowForce = 10;
    this.maxForce = 300;
    this.username =
      randomConso().toUpperCase() +
      randomVowel() +
      randomConso() +
      randomVowel() +
      randomConso() +
      randomVowel() +
      randomConso() +
      randomVowel();
    this.friction = 0.67;
    this.mass = 1;
    this.lastArrow = false;
    this.makeArrow = false;
    this.makeSuper = false;
    this.rotateKeys = [false, false];
    this.movementKeys = [false, false, false, false];
    this.hitWall = false;
    this.pendingRotate = [false, false];
    // up, down, left, right
  }
  decodeKeys(keys) {
    this.makeArrow = false;
    //console.log(keys[0]);
    this.movementKeys[0] = keys[0];
    this.movementKeys[1] = keys[1];
    this.movementKeys[2] = keys[2];
    this.movementKeys[3] = keys[3];
    if (keys[0]) this.pendingKeys[0] = true;
    if (keys[1]) this.pendingKeys[1] = true;
    if (keys[2]) this.pendingKeys[2] = true;
    if (keys[3]) this.pendingKeys[3] = true;
    /* if (keys[4] && this.arrowState) this.rot -= Math.PI * 0.012;
    if (keys[5] && this.arrowState) this.rot += Math.PI * 0.012;*/
    if (keys[4] && this.arrowState) {
      this.rotateKeys[0] = true;
      this.pendingRotate[0] = true;
    } else this.rotateKeys[0] = false;
    if (keys[5] && this.arrowState) {
      this.rotateKeys[1] = true;
      this.pendingRotate[1] = true;
    } else this.rotateKeys[1] = false;
    if (keys[6] === true && this.cooldowns.arrow.current <= 0) {
      this.arrowState = true;
      this.lastArrow = true;
    } else if (!keys[6]) {
      if (this.lastArrow) {
        this.cooldowns.arrow.current = this.cooldowns.arrow.max;
        this.lastArrow = false;
        this.makeArrow = true;
        this.cooldowns.spawn.current = 0;
      }
      this.arrowState = false;
    }
    if (keys[7] === true && this.cooldowns.super.current <= 0) {
      this.cooldowns.super.current = this.cooldowns.super.max;
      this.makeSuper = true;
    }
  }

  static getAllInitPack({ id, players }) {
    var initPacks = [];
    for (let i of Object.keys(players)) {
      if (players[i].id !== id) {
        initPacks.push(players[i].getInitPack());
      }
    }
    return initPacks;
  }
  static onDisconnect({ id, players, removePack }) {
    delete players[id];
    removePack.player.push(id);
  }
  static pack({ players, arena, platforms, currentTime }) {
    let pack = [];
		let copy = currentTime;
    for (let i of Object.keys(players)) {
			copy = currentTime;
			while(copy > 1/60){
				copy -= 1/60
				players[i].update(arena, platforms, 1/60);
			}
      pack.push(players[i].getUpdatePack());
    }
    return pack;
  }
  getUpdatePack() {
    return {
      id: this.id,
      pos: this.pos,
      username: this.username,
      chatTime: this.chatTime,
      chatMsg: this.chatMsg,
      rot: this.rot,
      arrowState: this.arrowState,
      arrowForce: this.arrowForce,
      cooldowns: this.cooldowns,
      kills: this.kills,
      hitWall: this.hitWall
    };
  }
  static collision({ playerArray, players }) {
    for (let i = 0; i < playerArray.length; i++) {
      for (let j = i + 1; j < playerArray.length; j++) {
        let player1 = players[playerArray[i][0]];
        let player2 = players[playerArray[j][0]];
        if (
          Math.sqrt(
            Math.abs(
              Math.pow(player2.pos.x - player1.pos.x, 2) +
                Math.pow(player2.pos.y - player1.pos.y, 2)
            )
          ) < 60
        ) {
          let distance = Math.sqrt(
            Math.abs(
              Math.pow(player2.pos.x - player1.pos.x, 2) +
                Math.pow(player2.pos.y - player1.pos.y, 2)
            )
          );
          let rotate = Math.atan2(
            player2.pos.y - player1.pos.y,
            player2.pos.x - player1.pos.x
          );
          player2.pos.x += ((Math.cos(rotate) * 1) / distance) * 170;
          player1.pos.x -= ((Math.cos(rotate) * 1) / distance) * 170;
          player2.pos.y += ((Math.sin(rotate) * 1) / distance) * 170;
          player1.pos.y -= ((Math.sin(rotate) * 1) / distance) * 170;
        }
      }
    }
  }
  getInitPack() {
    return {
      id: this.id,
      pos: this.pos,
      radius: this.radius,
      username: this.username,
      chatTime: this.chatTime,
      chatMsg: this.chatMsg,
      rot: this.rot,
      arrowState: this.arrowState,
      arrowForce: this.arrowForce,
      maxForce: this.maxForce,
      cooldowns: this.cooldowns,
      kills: this.kills,
      hitWall: this.hitWall
    };
  }
  applyForce(force) {
    return this.accel.add(force);
  }
  update(arena, platforms, delta) {
    //console.log(this.movementKeys);
    const vel = this.maxSpd * 40;
    /*if (this.movementKeys[0] || this.pendingKeys[0]) this.vel.y -= vel * delta;
    if (this.movementKeys[1] || this.pendingKeys[1]) this.vel.y += vel * delta;
    if (this.movementKeys[2] || this.pendingKeys[2]) this.vel.x -= vel * delta;
    if (this.movementKeys[3] || this.pendingKeys[3]) this.vel.x += vel * delta; */
    if (this.movementKeys[0] || this.pendingKeys[0]) this.vel.y -= this.accel * delta
    if (this.movementKeys[1] || this.pendingKeys[1]) this.vel.y += this.accel * delta
    if (this.movementKeys[2] || this.pendingKeys[2]) this.vel.x -= this.accel * delta
    if (this.movementKeys[3] || this.pendingKeys[3]) this.vel.x += this.accel * delta;
    if (this.vel.y > this.maxSpd) this.vel.y = this.maxSpd;
    if (this.vel.y < -this.maxSpd) this.vel.y = -this.maxSpd;
    if (this.vel.x > this.maxSpd) this.vel.x = this.maxSpd;
    if (this.vel.x < -this.maxSpd) this.vel.x = -this.maxSpd;
    if ((this.rotateKeys[0] || this.pendingRotate[0]) && this.arrowState)
      this.rot -= Math.PI * delta;
    if ((this.rotateKeys[1] || this.pendingRotate[0]) && this.arrowState)
      this.rot += Math.PI * delta;
    for (let i of Object.keys(this.cooldowns)) {
      this.cooldowns[i].update(delta);
    }
    if (!this.movementKeys[0] && !this.movementKeys[1]) {
      this.vel.y *= Math.pow(this.friction, delta * 15);
    }else{
				this.vel.y*=Math.pow(0.9,delta*16)
		}
    if (!this.movementKeys[2] && !this.movementKeys[3]) {
      this.vel.x *= Math.pow(this.friction, delta * 15);
    }else{
			this.vel.x*=Math.pow(0.9,delta*16)
		}
    this.chatTime -= delta;
    if (this.arrowState) {
      if (this.arrowForce < this.maxForce) this.arrowForce += 100 * delta; //5
    }
		if (this.arrowState) {
      this.pos.x += this.vel.x * 0.7 * delta;
      this.pos.y += this.vel.y * 0.7 * delta;
    } else {
      this.pos.x += this.vel.x * delta;
      this.pos.y += this.vel.y * delta;
    }
    this.hitWall = false;
    this.pendingKeys = [false, false, false, false];
    this.pendingRotate = [false, false];
		 if (this.pos.x - this.radius < 0) this.pos.x += (this.radius-this.pos.x)/(delta*200)
    if (this.pos.x + this.radius > arena.x + 0) this.pos.x += (arena.x - this.radius + 0-this.pos.x)/(delta*200)
    if (this.pos.y - this.radius < 0) this.pos.y += (this.radius - 0 - this.pos.y)/(delta*200)
    if (this.pos.y + this.radius > arena.y + 0) this.pos.y += (arena.y - this.radius + 0-this.pos.y)/(delta*200)
    for (let platform of platforms) {
      let rectHalfSizeX = platform.w / 2;
      let rectHalfSizeY = platform.h / 2;
      let rectCenterX = platform.x + rectHalfSizeX;
      let rectCenterY = platform.y + rectHalfSizeY;
      let distX = Math.abs(this.pos.x - rectCenterX);
      let distY = Math.abs(this.pos.y - rectCenterY);
      if (
        distX < rectHalfSizeX + this.radius &&
        distY < rectHalfSizeY + this.radius
      ) {
        let relX = (this.pos.x - rectCenterX) / rectHalfSizeX;
        let relY = (this.pos.y - rectCenterY) / rectHalfSizeY;
        if (Math.abs(relX) > Math.abs(relY)) {
          if (relX > 0) {
            this.pos.x = rectCenterX + rectHalfSizeX + this.radius;
            this.vel.x = 0;
            this.hitWall = true;
          } else {
            this.pos.x = rectCenterX - rectHalfSizeX - this.radius;
            this.vel.x = 0;
            this.hitWall = true;
          }
        } else {
          if (relY < 0) {
            this.pos.y = rectCenterY - rectHalfSizeY - this.radius;
            this.vel.y = 0;
            this.hitWall = true;
          } else {
            this.pos.y = rectCenterY + rectHalfSizeY + this.radius;
            this.vel.y = 0;
            this.hitWall = true;
          }
        }
      }
    }
    // console.log(this.currentCooldown, this.cooldown);
    //  console.log(up, down, right, left, this.pos, this.vel);
    /* if (up) this.mvt.y -= this.accel.y;
    if (down) this.mvt.y += this.accel.y;
    if (right) this.mvt.x += this.accel.x;
    if (left) this.mvt.x -= this.accel.x;*/
    /*if (this.mvt.x >= this.maxvel) {
      this.mvt.x = this.maxvel;
    }
    if (this.mvt.x <= -this.maxvel) {
      this.mvt.x = -this.maxvel;
    }
    if (this.mvt.y >= this.maxvel) {
      this.mvt.y = this.maxvel;
    }
    if (this.mvt.y >= -this.maxvel) {
      this.mvt.y = -this.maxvel;
    }

    this.pos.x += this.mvt.x;
    this.pos.y += this.mvt.y;

    if (!up && !down) {
      this.mvt.y *= this.friction;
    }
    if (!right && !left) {
      this.mvt.x *= this.friction;
    }*/

    /* if (this.pos.x <= 20){
      this.pos.x = 20;
    }
    if (this.pos.x >= 1600-20){
      this.pos.x = 1600-20;
    }
    if (this.pos.y <= 20){
      this.pos.y = 20;
    }
    if (this.pos.y >= 900-20){
      this.pos.y = 900-20;
    }
    */
  }
};
