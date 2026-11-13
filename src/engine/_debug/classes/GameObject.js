import DebugObjects from '../../ui/debug/DebugObjects.js';
import { Matrix2d } from '../../core/lang/Matrix.js';


const debug = {
  'objectOrigins': ({ api, txfm, renderContext }) => {
    const mtx = Matrix2d.from(txfm);
    mtx.clearFlips();
    api.pushTransform(mtx);
    DebugObjects.Origin(renderContext, mtx.e, mtx.f, 
      [txfm.e, txfm.f], 
      txfm.rotation);
    api.popTransform();
  },

  'boundingBoxes': ({ api, txfm, boundingBox, renderContext }) => {
    const mtx = Matrix2d.from(txfm);
    // mtx.clearFlips();
    api.pushTransform(mtx);
    DebugObjects.BoundingBox(boundingBox, renderContext);
    api.popTransform();
  },
  
  profiling: {
    color: "secondary",
    methods: [ "update", "render" ],
    inTrack: "GameWorld",
    asGroup: "Game Objects"
  }
};

export default debug;