import TileMap from './TileMap.js';
import $Math from '../../core/Math.js';

export default class PlatformerMap extends TileMap {
  #rows = null;
  #collisionMap = null;
  #triggers = null;
  // ... more to come??
  // maybe a way to turn tile runs into gameobjects?

  async loadTileMap() {
    this.#rows = new Array(this.tileMap.size[1]).fill(0);

    this.#rows.forEach((e, i) => {
      this.#rows[i] = new Array(this.tileMap.size[0]).fill(0);
    });

    // process tile runs
    for (const run of this.tileMap.runs) {
      const tile = this.tileSheet.tiles.get(run.tile);
      let startCap = null, endCap = null;

      // end caps of the run
      if (run['caps']) {
        startCap = this.tileSheet.tiles.get(run.caps.start);
        endCap = this.tileSheet.tiles.get(run.caps.end);
      }

      if (run['horiz']) {
        // process horizontal runs
        for (const hRun of run['horiz']) {
          this.#createHorizontalRun(tile, hRun, startCap, endCap, run.hRotate ? run.hRotate : 0);
        }
      }

      if (run['vert']) {
        // process vertical runs
        for (const vRun of run['vert']) {
          this.#createVerticalRun(tile, vRun, startCap, endCap, run.vRotate ? run.vRotate : 0);
        }
      }
    }
    
    // process sparse tiles
    for (const tileName in this.tileMap.tiles) {
      const tile = this.tileSheet.tiles.get(tileName);
      for (const tilePos of this.tileMap.tiles[tileName]) {
        this.#createSparseTile(tile, tilePos);
      }
    }

    // render to an offscreen canvas
    this.#render();
  }

  #createHorizontalRun(tile, horizontalRun, startCap, endCap, rotate = 0) {
    const xStart = horizontalRun[0],
          xEnd = horizontalRun[1],
          y = horizontalRun[2];

    const row = this.#rows[y];

    for (let xPos = xStart; xPos <= xEnd; xPos++) { 
      // add tile at position
      if (startCap !== null && xPos === xStart) {
        row[xPos] = {tile: startCap, rotate: rotate};
      } else if (endCap !== null && xPos === xEnd) {
        row[xPos] = {tile: endCap, rotate: rotate};
      } else {
        row[xPos] = {tile: tile, rotate: rotate};
      }
    }
  }

  #createVerticalRun(tile, verticalRun, startCap, endCap, rotate = 0) {
    const x = verticalRun[0],
          yStart = verticalRun[1],
          yEnd = verticalRun[2];
          
    for (let yPos = yStart; yPos <= yEnd; yPos++) { 
      // add tile at position
      if (startCap !== null && yPos === yStart) {
        this.#rows[yPos][x] = {tile: startCap, rotate: rotate};
      } else if (endCap !== null && yPos === yEnd) {
        this.#rows[yPos][x] = {tile: endCap, rotate: rotate};
      } else {
        this.#rows[yPos][x] = {tile: tile, rotate: rotate};
      }
    }
  }

  #createSparseTile(tile, position) {
    const x = position[0],
          y = position[1];
    this.#rows[y][x] = {tile: tile, rotate: 0};
  }

  #render() {
    const canvas = new OffscreenCanvas(this.tileSheet.tileSize[0] * this.tileMap.size[0], this.tileSheet.tileSize[1] * this.tileMap.size[1]);
    const ctx = canvas.getContext('2d');
    
    for (let x = 0; x < this.tileMap.size[0]; x++) {
      for (let y = 0; y < this.tileMap.size[1]; y++) {
        if (this.#rows[y][x] !== 0) {
          const entry = this.#rows[y][x];
          const tile = entry.tile;
          const frame = tile.frameRect;
          ctx.save();
          ctx.rotate($Math.degToRad(entry.rotate));
          ctx.translate(this.tileSheet.tileSize[0], -this.tileSheet.tileSize[1]);
          ctx.drawImage(tile.sourceImage, 
            frame[0], frame[1], frame[2], frame [3],  // source frame 
            x * this.tileSheet.tileSize[0],   // dest frame
            y * this.tileSheet.tileSize[1], frame[2], frame[3]);
          ctx.restore();
        }  
      }
    }
    
    this.generated = canvas;
  }
}
