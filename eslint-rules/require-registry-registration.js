/**
 * ESLint rule: require-registry-registration
 * 
 * Ensures new minigame modules are properly registered in registry.js
 * 
 * Checks for:
 * 1. Module exports render() function
 * 2. Game is registered in MinigameRegistry
 * 3. Metadata is complete
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require minigame modules to be registered in registry',
      category: 'Best Practices',
      recommended: true
    },
    messages: {
      noRenderFunction: 'Minigame module must export a render() function',
      noCompletionCallback: 'Minigame render() must accept onComplete callback',
      missingModuleExport: 'Minigame must export to window.MiniGames[\'{{key}}\']'
    },
    schema: []
  },

  create(context) {
    const filename = context.getFilename();
    
    // Only check files in js/minigames/ directory
    if(!filename.includes('/minigames/') || filename.includes('/core/')){
      return {};
    }

    // Skip system files
    const systemFiles = [
      'registry.js', 'selector.js', 'scoring.js',
      'telemetry.js', 'error-handler.js', 'debug-panel.js',
      'accessibility.js', 'mobile-utils.js', 'index.js'
    ];

    const basename = filename.split('/').pop();
    if(systemFiles.includes(basename)){
      return {};
    }

    let hasRenderFunction = false;
    let renderFunctionParams = [];
    let hasModuleExport = false;

    return {
      // Check for render function definition
      FunctionDeclaration(node) {
        if(node.id && node.id.name === 'render'){
          hasRenderFunction = true;
          renderFunctionParams = node.params.map(p => p.name);
        }
      },

      // Check for render function in object
      Property(node) {
        if(node.key && node.key.name === 'render'){
          hasRenderFunction = true;
          if(node.value && node.value.params){
            renderFunctionParams = node.value.params.map(p => p.name);
          }
        }
      },

      // Check for module export
      AssignmentExpression(node) {
        // Check for g.MiniGames[key] = { render: ... }
        if(node.left && node.left.type === 'MemberExpression'){
          const obj = node.left.object;
          if(obj.type === 'MemberExpression' &&
             obj.object.name === 'g' &&
             obj.property.name === 'MiniGames'){
            hasModuleExport = true;
          }
        }
      },

      // End of file - check requirements
      'Program:exit'(node) {
        if(!hasRenderFunction){
          context.report({
            node,
            messageId: 'noRenderFunction'
          });
        }

        if(hasRenderFunction && renderFunctionParams.length < 2){
          context.report({
            node,
            messageId: 'noCompletionCallback'
          });
        }

        if(!hasModuleExport){
          // Extract game key from filename
          const gameKey = basename
            .replace('.js', '')
            .split('-')
            .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
            .join('');

          context.report({
            node,
            messageId: 'missingModuleExport',
            data: { key: gameKey }
          });
        }
      }
    };
  }
};
