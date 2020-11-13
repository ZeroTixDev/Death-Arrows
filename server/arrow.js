'use strict';

module.exports = class Arrow {
  constructor(x, y, angle, speed, id, parent, around = false) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.xv = Math.cos(this.angle) * (speed * 1) * 20;
    this.yv = Math.sin(this.angle) * (speed * 1) * 20;
    this.speed = speed;
    this.life = 3;
    this.around = around;
    this.height = 10 * 2;
    this.width = 23 * 2;
    this.dead = false;
    this.id = id;
    this.parent = parent;
  }

  static getAllInitPack({ arrows }) {
    const initPacks = [];
    for (const i of Object.keys(arrows)) {
      initPacks.push(arrows[i].getInitPack());
    }
    return initPacks;
  }
  static pack({
    arrows,
    removePack,
    platforms,
    currentTime,
    database, // eslint-disable-line no-unused-vars
    players,
    collideCircleWithRotatedRectangle,
    randomSpawnPos,
  }) {
    const pack = [];
    let copy = currentTime;
    let highscore = { name: 'zero', score: 0 };
    for (const i of Object.keys(arrows)) {
      copy = currentTime;
      let deleted = false;
      while (copy > 1 / 60) {
        copy -= 1 / 60;
        if (arrows[i]) {
          arrows[i].update(platforms, 1 / 60);
          for (const j of Object.keys(players)) {
            const player = players[j];
            if (
              collideCircleWithRotatedRectangle(player, arrows[i]) &&
              arrows[i].parent !== players[j].id &&
              players[j].cooldowns.spawn.current <= 0
            ) {
              const pos = randomSpawnPos();
              if (pos) players[j].pos = pos;
              players[j].cooldowns.spawn.current = players[j].cooldowns.spawn.max;
              if (players[arrows[i].parent]) {
                players[arrows[i].parent].previous_kills = players[arrows[i].parent].kills;
                players[arrows[i].parent].kills++;
                if (players[arrows[i].parent].kills > highscore.score) {
                  highscore = { name: players[arrows[i].parent].username, score: players[arrows[i].parent].kills };
                }
              }
              removePack.arrow.push({ id: arrows[i].id, type: 'player' });
              delete arrows[i];
              deleted = true;
              break;
            }
          }
        }
      }
      if (arrows[i] && arrows[i].dead && !deleted) {
        removePack.arrow.push({ id: arrows[i].id, type: 'wall' });
        delete arrows[i];
        // Arrow.onDisconnect({ id: i, arrows, removePack });
      } else if (arrows[i] && !deleted) {
        pack.push(arrows[i].getUpdatePack());
      }
    }
    return { pack, highscore };
  }
  getUpdatePack() {
    const object = {
      id: this.id,
      x: Math.round(this.x),
      y: Math.round(this.y),
    };
    if (this.around) {
      object.angle = Math.round(this.angle * 100) / 100;
    }
    return object;
  }
  getInitPack() {
    return {
      id: this.id,
      x: Math.round(this.x),
      y: Math.round(this.y),
      width: this.width,
      height: this.height,
      angle: this.angle,
      parent: this.parent,
      around: this.around,
    };
  }
  update(platforms, delta) {
    this.x += this.xv * delta;
    this.y += this.yv * delta;
    if (this.around) {
      this.xv = Math.cos(this.angle) * this.speed * 20;
      this.yv = Math.sin(this.angle) * this.speed * 20;
      this.angle += Math.PI * 2 * delta;
    }
    this.life -= delta;
    if (this.life < 0) {
      this.dead = true;
    }

    /*
    x*cos(t) - y*sin(t)
    */
    /*
   function rotate(x, y, a)
  local c = math.cos(a)
  local s = math.sin(a)
  return c*x - s*y, s*x + c*y
  const [x,y] = [];
  */
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    //const [x, y] = [c * this.x - s * this.y, s * this.x + c * this.y];
    // console.log(x - this.x);
    for (const platform of platforms) {
      if (
        doPolygonsIntersect(
          [
            { x: this.x, y: this.y },
            { x: this.x + this.width * c, y: this.y },
            { x: this.x + this.width * c, y: this.y + this.height * s },
            { x: this.x, y: this.y + s * this.height },
          ],
          [
            { x: platform.x, y: platform.y },
            { x: platform.x + platform.w, y: platform.y },
            { x: platform.x + platform.w, y: platform.y + platform.h },
            { x: platform.x, y: platform.y + platform.h },
          ]
        )
      ) {
        this.dead = true;
      }
    }
    /*console.log({
      x: this.x,
      y: this.y,
      xv: this.xv,
      yv: this.yv,
      life: this.life
    });*/
  }
};

function doPolygonsIntersect(a, b) {
  const polygons = [a, b];
  let minA, maxA, projected, i, i1, j, minB, maxB;

  for (i = 0; i < polygons.length; i++) {
    // for each polygon, look at each edge of the polygon, and determine if it separates
    // the two shapes
    const polygon = polygons[i];
    for (i1 = 0; i1 < polygon.length; i1++) {
      // grab 2 vertices to create an edge
      const i2 = (i1 + 1) % polygon.length;
      const p1 = polygon[i1];
      const p2 = polygon[i2];

      // find the line perpendicular to this edge
      const normal = { x: p2.y - p1.y, y: p1.x - p2.x };

      minA = maxA = undefined;
      // for each vertex in the first shape, project it onto the line perpendicular to the edge
      // and keep track of the min and max of these values
      for (j = 0; j < a.length; j++) {
        projected = normal.x * a[j].x + normal.y * a[j].y;
        if (minA === undefined || projected < minA) {
          minA = projected;
        }
        if (maxA === undefined || projected > maxA) {
          maxA = projected;
        }
      }

      // for each vertex in the second shape, project it onto the line perpendicular to the edge
      // and keep track of the min and max of these values
      minB = maxB = undefined;
      for (j = 0; j < b.length; j++) {
        projected = normal.x * b[j].x + normal.y * b[j].y;
        if (minB === undefined || projected < minB) {
          minB = projected;
        }
        if (maxB === undefined || projected > maxB) {
          maxB = projected;
        }
      }

      // if there is no overlap between the projects, the edge we are looking at separates the two
      // polygons, and we know there is no overlap
      if (maxA < minB || maxB < minA) {
        return false;
      }
    }
  }
  return true;
}
