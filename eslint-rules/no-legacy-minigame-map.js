/**
 * ESLint rule: no-legacy-minigame-map
 * 
 * Prevents direct use of legacy minigame key maps.
 * All minigame selection should go through MinigameSelector or MinigameRegistry.
 * 
 * ❌ Bad:
 * const games = ['clicker', 'memory', 'math'];
 * const legacyMap = { 'clicker': 'quickTap' };
 * 
 * ✅ Good:
 * const games = MinigameRegistry.getImplementedGames();
 * const key = MinigameCompatBridge.resolveKey('clicker');
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct use of legacy minigame key maps',
      category: 'Best Practices',
      recommended: true
    },
    messages: {
      noLegacyMap: 'Direct legacy minigame maps are not allowed. Use MinigameRegistry or MinigameCompatBridge instead.',
      noHardcodedKeys: 'Hardcoded legacy game key detected: "{{key}}". Use registry-based selection instead.'
    },
    fixable: 'code',
    schema: []
  },

  create(context) {
    // Legacy keys that should not be hardcoded
    const LEGACY_KEYS = [
      'clicker', 'memory', 'math', 'bar', 'typing',
      'reaction', 'numseq', 'pattern', 'slider',
      'anagram', 'path', 'target', 'pairs', 'simon', 'estimate'
    ];

    // Allowed contexts where legacy keys are okay
    const ALLOWED_FILES = [
      'compat-bridge.js',
      'index.js',
      'minigames.js'
    ];

    // Check if we're in an allowed file
    const filename = context.getFilename();
    const isAllowedFile = ALLOWED_FILES.some(allowed => filename.endsWith(allowed));

    return {
      // Check for legacy map objects
      ObjectExpression(node) {
        if(isAllowedFile) return;

        // Look for objects that look like legacy maps
        const properties = node.properties;
        let legacyKeyCount = 0;

        for(const prop of properties){
          if(prop.key && prop.key.type === 'Literal'){
            if(LEGACY_KEYS.includes(prop.key.value)){
              legacyKeyCount++;
            }
          }
        }

        // If multiple legacy keys are mapped, it's probably a legacy map
        if(legacyKeyCount >= 3){
          context.report({
            node,
            messageId: 'noLegacyMap'
          });
        }
      },

      // Check for array literals with legacy keys
      ArrayExpression(node) {
        if(isAllowedFile) return;

        const elements = node.elements;
        let legacyKeyCount = 0;

        for(const element of elements){
          if(element && element.type === 'Literal' && typeof element.value === 'string'){
            if(LEGACY_KEYS.includes(element.value)){
              legacyKeyCount++;
            }
          }
        }

        // If multiple legacy keys in array, probably hardcoded list
        if(legacyKeyCount >= 3){
          context.report({
            node,
            messageId: 'noLegacyMap'
          });
        }
      },

      // Check for hardcoded string literals that are legacy keys
      Literal(node) {
        if(isAllowedFile) return;
        
        if(typeof node.value === 'string' && LEGACY_KEYS.includes(node.value)){
          // Check parent context - is this being used as a game key?
          const parent = node.parent;
          
          // If it's being passed to renderMinigame or similar
          if(parent.type === 'CallExpression'){
            const callee = parent.callee;
            if(callee.name === 'renderMinigame' || 
               (callee.property && callee.property.name === 'render')){
              context.report({
                node,
                messageId: 'noHardcodedKeys',
                data: {
                  key: node.value
                }
              });
            }
          }
        }
      }
    };
  }
};
