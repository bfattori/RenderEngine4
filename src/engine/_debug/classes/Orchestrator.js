import CanvasPIP from '../../ui/debug/CanvasPIP.js';
import protocol from '../../particlesystem/threading/Protocol.js';

const debug = {
  "showParticleWorkersPiP:rendered": ({event}) => {
      const image = CanvasPIP.copyImage(event.data.image);
      postMessage({ 
          re4: protocol.MSG.ORCHESTRATOR, 
          workerId: event.data.workerId, 
          type: protocol.MTYPE.ORCHESTRATOR.WORKER_RENDERED, 
          image: image 
      }, [ image ]);
  }
}

export default debug;