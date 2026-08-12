import RenderEngineError from '../../core/RenderEngineError.js';

/**
 * @private
 */
class State {
    #name = null;
    #priority;
    #targets;

    /**
     * A discreet state within a `StateTable` with an ordering priority
     * and reachable states.
     * 
     * @param {String} name - The state name
     * @param {Number} priority - The state priority
     * @param {Array<String>} targetStates - Target states rechable directly from this state
     */
    constructor(name, priority = 1.0, targetStates = []) {
        this.#name = name;
        this.#priority = priority;
        this.#targets = targetStates;
    }

    /**
     * The state name
     * @returns {String}
     */
    get name() {
        return this.#name;
    }

    /**
     * The state's ordering priority is used when a transition results in multiple paths.
     * @returns {Number}
     */
    get priority() {
        return this.#priority;
    }

    /**
     * Set the ordering priority to resolve conflicts when a transition would result in multiple paths.
     * @param {Number} priority - A value between 0.0 and 1.0 with 1.0 being more favorable for path inclusion
     */
    set priority(priority) {
        this.#priority = priority;
    }

    /**
     * The target state names array.
     * @returns {Array<String>}
     */
    get targetStates() {
        return this.#targets;
    }
}

/**
 * A state table is a way to define object transitional states and find the
 * path from one state to another. Also known as decision trees, you define
 * all the possible states that can be directly reached from a source state.
 * Then it is possible to calculate the transition chain from one state
 * to another, allowing for things like animation transitions or enemy decisions.
 */
export default class StateTable extends Map {
    /**
     * Add a new state to the table. To reduce the chance that a transition chain would
     * result in multiple possible paths, the priority allows for hinting at the proper
     * chain to select when such collisions occur. The highest priority state will be
     * selected to link the chain.
     * 
     * @param {String} stateName - The state to add
     * @param {number} priority - Transition chain influence priority (default: 1.0)
     */
    addState(stateName, priority = 1.0) {
        return this.getOrInsert(stateName, new State(stateName, priority));
    }

    /**
     * Remove a state from the table.
     * @param {String} stateName - The state to remove 
     */
    removeState(stateName) {
        this.delete(stateName);
    }

    /**
     * Add a direct target state from a source state. The states must already exist in the table
     * to be able to create a transition between them. _Circular states (from === to) are
     * not allowed._
     * 
     * @param {String} sourceState - The source state
     * @param {String} targetState - The target state
     */
    addTransition(sourceState, targetState) {
        // states need to exist to be able to add transitions to them
        if (!this.get(sourceState) || !this.get(targetState))
            throw new RenderEngineError(`${!this.get(sourceState) ? sourceState + ' is not a valid state.' : ''}`+
                `${!this.get(targetState) ? targetState + ' is not a valid state.' : ''}`);
        
        // circular reference
        if(sourceState.toLowerCase() === targetState.toLowerCase())
            throw new RenderEngineError(`Invalid circular state assignment: ${sourceState}`);

        const stateTransitions = this.get(sourceState);
        if (!stateTransitions.targetStates.includes(targetState))
            stateTransitions.targetStates.push(targetState);
    }

    /**
     * Remove a transition from one state to another.
     * 
     * @param {String} sourceState - The source state 
     * @param {String} targetState - The target state
     */
    removeTransition(sourceState, targetState) {
        const stateTransitions = this.get(sourceState);
        if (stateTransitions && stateTransitions.targetStates.includes(targetState))
            stateTransitions.targetStates.splice(stateTransitions.targetStates.indexOf(targetState), 1);
    }

    /**
     * Calculate the transition chain to go from the source state to the target state.
     * Returns `null` if `targetState` cannot be reached from `sourceState`.
     * 
     * **For example:** Given a source `crouch` state which has a single target of `stand`,
     * and a `run` state with `walk` and `jump` targets, the source and target states _do not
     * share_ a common target state.
     * 
     * _However,_ `stand` was defined with `jump` and `walk` as targets, which are both defined as
     * targets for `run`, so there are two possible chains. Having configured `walk` with a higher 
     * priority over `jump` gives a hint to select the _logical path._ The final chain can be found
     * which could be used to queue up animations for a sprite.
     * 
     * **Example final chain:**
     * ```
     * crouch -> stand -> walk -> run
     * ```
     *  
     * @param {String} sourceState - The source state
     * @param {String} targetState - The desired target state
     * @returns {Array<String>|null} The transition states chain, or `null`
     */
    getTransitionChain(sourceState, targetState, chain) {
        const transitionChain = chain || [sourceState];
        const sources = this.get(sourceState).targetStates;
        const targets = this.get(targetState).targetStates;

        let links = sources.filter(state => targets.includes(state));
        if (links.length > 1) {
            // select highest priority
            links.sort((a, b) => a.priority - b.priority);
            transitionChain.push(links[0]);
        } else if (links.length === 1) {
            transitionChain.push(links[0]);
        } else {
            // no direct link, hunt
            sources.forEach(state => this.getTransitionChain(state, targetState, chain));
        }
        if (chain) return;  // un-roll

        // non-reachable
        if (transitionChain.length === 1)
            return null;

        transitionChain.push(targetState);        
        return transitionChain;
    }
}