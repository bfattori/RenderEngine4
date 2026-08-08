import Context from '../../Context.js';

import { IL as pIL, VECTOR_IL as pVECTOR_IL, RASTER_IL as pRASTER_IL } from './languages/IL.js';
import { IL as dIL, VECTOR_IL as dVECTOR_IL, RASTER_IL as dRASTER_IL } from './languages/debugIL.js';

const ctx = Context.getInstance();

const langs = {
  IL: ctx.debug ? dIL : pIL,
  VECTOR_IL: ctx.debug ? dVECTOR_IL : pVECTOR_IL,
  RASTER_IL: ctx.debug ? dRASTER_IL : pRASTER_IL
};

const IL = langs.IL;
const VECTOR_IL = langs.VECTOR_IL;
const RASTER_IL = langs.RASTER_IL;

export {
  IL,
  VECTOR_IL,
  RASTER_IL
};
