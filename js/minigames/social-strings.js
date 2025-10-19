// MODULE: minigames/social-strings.js
// Social Strings - Match houseguest pairs based on their alliances

(function(g){
  'use strict';

  /**
   * Social Strings - Alliance matching game
   * Players identify which houseguests are in alliances together
   * 3 rounds with increasing difficulty
   * 
   * CLEAR PROMPTS:
   * - Round 1: Easy pairs (2 choices, strong alliances)
   * - Round 2: Medium difficulty (3 choices)
   * - Round 3: Hard difficulty (4 choices)
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;gap:16px;padding:20px;max-width:500px;margin:0 auto;';
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Social Strings';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;text-align:center;';
    
    // Instructions
    const instructions = document.createElement('div');
    instructions.innerHTML = `
      <p style="margin:0 0 8px 0;font-size:0.95rem;color:#e3ecf5;text-align:center;">
        <strong>Match houseguests who are in the same alliance!</strong>
      </p>
      <p style="margin:0;font-size:0.85rem;color:#95a9c0;text-align:center;">
        An alliance is a secret group working together to advance in the game.
      </p>
    `;
    
    // Progress indicator
    const progress = document.createElement('div');
    progress.style.cssText = 'font-size:0.85rem;color:#95a9c0;text-align:center;';
    
    // Question text
    const questionText = document.createElement('div');
    questionText.style.cssText = 'font-size:1rem;color:#e3ecf5;min-height:50px;text-align:center;padding:12px;background:#1d2734;border-radius:8px;';
    
    // Answer buttons container
    const answersContainer = document.createElement('div');
    answersContainer.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
    
    // Game state
    let currentRound = 0;
    let correctAnswers = 0;
    const totalRounds = 3;
    let questions = [];
    
    // Get game data
    const game = g.game || {};
    const players = game.players || [];
    const alliances = game.alliances || [];
    const relationships = game.relationships || {};
    
    /**
     * Generate questions based on game state
     */
    function generateQuestions(){
      questions = [];
      
      // Get alive players only
      const alivePlayers = players.filter(p => !p.evicted && p.name);
      
      if(alivePlayers.length < 4){
        // Not enough players - create fallback questions
        return generateFallbackQuestions();
      }
      
      // Round 1: Easy - 2 options (one correct alliance pair, one random)
      const round1 = generateAllianceQuestion(alivePlayers, alliances, 2, 'easy');
      if(round1) questions.push(round1);
      
      // Round 2: Medium - 3 options
      const round2 = generateAllianceQuestion(alivePlayers, alliances, 3, 'medium');
      if(round2) questions.push(round2);
      
      // Round 3: Hard - 4 options
      const round3 = generateAllianceQuestion(alivePlayers, alliances, 4, 'hard');
      if(round3) questions.push(round3);
      
      // If we couldn't generate enough questions, add fallbacks
      while(questions.length < 3){
        questions.push(generateFallbackQuestions()[0]);
      }
    }
    
    /**
     * Generate an alliance-based question
     */
    function generateAllianceQuestion(alivePlayers, alliances, numOptions, difficulty){
      // Find alliances with at least 2 alive members
      const viableAlliances = alliances.filter(al => {
        const aliveMembers = al.members.filter(id => {
          const p = alivePlayers.find(player => player.id === id);
          return p && !p.evicted;
        });
        return aliveMembers.length >= 2;
      });
      
      if(viableAlliances.length === 0){
        return null;
      }
      
      // Pick a random alliance
      const targetAlliance = viableAlliances[Math.floor(Math.random() * viableAlliances.length)];
      const aliveAllianceMembers = targetAlliance.members
        .map(id => alivePlayers.find(p => p.id === id))
        .filter(p => p && !p.evicted);
      
      if(aliveAllianceMembers.length < 2){
        return null;
      }
      
      // Pick the anchor player (who to match with)
      const anchor = aliveAllianceMembers[Math.floor(Math.random() * aliveAllianceMembers.length)];
      
      // Build answer choices
      const choices = [];
      
      // Add correct answer (another alliance member)
      const correctOptions = aliveAllianceMembers.filter(p => p.id !== anchor.id);
      if(correctOptions.length === 0) return null;
      
      const correctAnswer = correctOptions[Math.floor(Math.random() * correctOptions.length)];
      choices.push({ player: correctAnswer, isCorrect: true });
      
      // Add wrong answers (non-alliance members)
      const nonAllianceMembers = alivePlayers.filter(p => 
        p.id !== anchor.id && 
        !targetAlliance.members.includes(p.id)
      );
      
      // Shuffle and pick wrong answers
      const shuffledWrong = nonAllianceMembers.sort(() => Math.random() - 0.5);
      for(let i = 0; i < numOptions - 1 && i < shuffledWrong.length; i++){
        choices.push({ player: shuffledWrong[i], isCorrect: false });
      }
      
      // Shuffle choices
      choices.sort(() => Math.random() - 0.5);
      
      const difficultyLabel = difficulty === 'easy' ? 'Round 1' : difficulty === 'medium' ? 'Round 2' : 'Round 3';
      
      return {
        question: `Which houseguest is in an alliance with <strong>${anchor.name}</strong>?`,
        choices: choices,
        difficulty: difficultyLabel
      };
    }
    
    /**
     * Generate fallback questions when no alliances exist
     */
    function generateFallbackQuestions(){
      // Generic Big Brother alliance knowledge questions
      return [
        {
          question: 'In Big Brother, which pair would MOST LIKELY be in an alliance?',
          choices: [
            { text: 'Two players who trust each other', isCorrect: true },
            { text: 'The current nominees', isCorrect: false },
            { text: 'Players who never talk', isCorrect: false }
          ].sort(() => Math.random() - 0.5),
          difficulty: 'Round 1',
          isFallback: true
        },
        {
          question: 'What is the MAIN purpose of forming an alliance?',
          choices: [
            { text: 'To protect each other from eviction', isCorrect: true },
            { text: 'To compete in challenges alone', isCorrect: false },
            { text: 'To vote randomly each week', isCorrect: false }
          ].sort(() => Math.random() - 0.5),
          difficulty: 'Round 2',
          isFallback: true
        },
        {
          question: 'Which strategy shows TWO players are likely allied?',
          choices: [
            { text: 'They consistently vote the same way', isCorrect: true },
            { text: 'They nominate each other every week', isCorrect: false },
            { text: 'They refuse to talk game', isCorrect: false },
            { text: 'They argue publicly often', isCorrect: false }
          ].sort(() => Math.random() - 0.5),
          difficulty: 'Round 3',
          isFallback: true
        }
      ];
    }
    
    /**
     * Display current question
     */
    function showQuestion(){
      if(currentRound >= questions.length || currentRound >= totalRounds){
        // Quiz complete
        const score = Math.max(20, Math.min(100, (correctAnswers / totalRounds) * 80 + 20));
        
        questionText.innerHTML = '<strong>Challenge Complete!</strong>';
        answersContainer.innerHTML = '';
        progress.innerHTML = `You got <strong>${correctAnswers} out of ${totalRounds}</strong> correct!`;
        
        setTimeout(() => {
          onComplete(score);
        }, 2000);
        return;
      }
      
      const question = questions[currentRound];
      progress.textContent = `${question.difficulty} of 3`;
      questionText.innerHTML = question.question;
      answersContainer.innerHTML = '';
      
      // Create answer buttons
      question.choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        
        // Handle both player objects and text fallbacks
        if(choice.player){
          btn.textContent = choice.player.name;
        } else if(choice.text){
          btn.textContent = choice.text;
        }
        
        btn.style.cssText = 'padding:12px 20px;text-align:center;font-size:0.95rem;';
        
        btn.addEventListener('click', () => {
          // Disable all buttons
          answersContainer.querySelectorAll('button').forEach(b => b.disabled = true);
          
          if(choice.isCorrect){
            // Correct!
            btn.style.background = '#77d58d';
            btn.style.color = '#fff';
            correctAnswers++;
          } else {
            // Wrong
            btn.style.background = '#ff6d6d';
            btn.style.color = '#fff';
            // Highlight correct answer
            const correctIndex = question.choices.findIndex(c => c.isCorrect);
            if(correctIndex >= 0){
              answersContainer.querySelectorAll('button')[correctIndex].style.background = '#77d58d';
              answersContainer.querySelectorAll('button')[correctIndex].style.color = '#fff';
            }
          }
          
          setTimeout(() => {
            currentRound++;
            showQuestion();
          }, 1500);
        }, { passive: false });
        
        answersContainer.appendChild(btn);
      });
    }
    
    // Initialize game
    generateQuestions();
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(progress);
    wrapper.appendChild(questionText);
    wrapper.appendChild(answersContainer);
    container.appendChild(wrapper);
    
    // Start first question
    showQuestion();
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.socialStrings = { render };

})(window);
