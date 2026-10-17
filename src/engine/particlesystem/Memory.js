
export default class ParticleMemory {
  #memory = null;
  #offset = 0;
  
  // static particle size allocation
  static PSIZE = 592;

  constructor(particleCount) {
    this.#memory = new ArrayBuffer(particleCount * ParticleMemory.PSIZE);
  }

  /**
   * Fixed allocator
   * @returns {DataView}
   */
  malloc() {
    const mem = new DataView(this.#memory, this.#offset, ParticleMemory.PSIZE);
    this.#offset += ParticleMemory.PSIZE;
    if (this.#offset > this.#memory.byteLength) {
      this.#offset = 0;
    }
    return mem;
  }
}