// MODULE: minigames/trivia-quiz.js
// Trivia Quiz - Answer multiple choice questions

(function(g){
  'use strict';

  const QUESTIONS = [
    // Basic Game Mechanics (Easy)
    { q: 'What year was Big Brother first aired in the US?', a: ['2000', '1999', '2001', '2002'], correct: 0 },
    { q: 'How many houseguests typically start each season?', a: ['12', '14', '16', '18'], correct: 2 },
    { q: 'What does HOH stand for?', a: ['Head of House', 'Head of Household', 'House of Honor', 'Hero of House'], correct: 1 },
    { q: 'How many nominees are typically put up each week?', a: ['1', '2', '3', '4'], correct: 1 },
    { q: 'What competition can save a nominee?', a: ['HOH', 'Veto', 'Jury', 'Vote'], correct: 1 },
    { q: 'Where do evicted players go after jury starts?', a: ['Home', 'Jury House', 'Sequester', 'Hotel'], correct: 1 },
    { q: 'Who votes in the finale?', a: ['America', 'Host', 'Jury', 'Nominees'], correct: 2 },
    { q: 'What is a "backdoor" in Big Brother?', a: ['Exit door', 'Secret room', 'Veto strategy', 'Alliance name'], correct: 2 },
    
    // More Core Rules (Easy)
    { q: 'What does POV stand for?', a: ['Point of View', 'Power of Veto', 'Player of Victory', 'Power of Vote'], correct: 1 },
    { q: 'Who usually cannot compete for HOH?', a: ['Nominees', 'Previous HOH', 'Veto winner', 'Have-nots'], correct: 1 },
    { q: 'How many people typically compete in POV?', a: ['4', '6', '8', '10'], correct: 1 },
    { q: 'What happens on eviction night?', a: ['Nominations', 'Someone leaves', 'POV ceremony', 'Alliance forms'], correct: 1 },
    { q: 'Who breaks tie votes?', a: ['America', 'Host', 'HOH', 'Oldest player'], correct: 2 },
    { q: 'What is the Diary Room for?', a: ['Storage', 'Confessionals', 'Sleeping', 'Competitions'], correct: 1 },
    { q: 'What day is eviction typically?', a: ['Monday', 'Wednesday', 'Thursday', 'Saturday'], correct: 2 },
    { q: 'How many jury members usually vote?', a: ['5', '7', '9', '11'], correct: 2 },
    
    // Strategy & Terminology (Medium)
    { q: 'What is a "floater" strategy?', a: ['Swimming', 'Avoiding alliances', 'Floating votes', 'Being lazy'], correct: 1 },
    { q: 'What is a "showmance"?', a: ['TV show', 'House romance', 'Performance', 'Drama'], correct: 1 },
    { q: 'What is "jury management"?', a: ['Managing jurors', 'Building jury votes', 'Controlling jury', 'Avoiding jury'], correct: 1 },
    { q: 'What does "throwing a comp" mean?', a: ['Give up', 'Lose intentionally', 'Throw objects', 'Get angry'], correct: 1 },
    { q: 'What is a "pawn"?', a: ['Chess piece', 'Safe nominee', 'Weak player', 'Sacrifice'], correct: 1 },
    { q: 'What is a "blindside"?', a: ['Surprise eviction', 'Closed eyes', 'Darkness', 'Betrayal'], correct: 0 },
    { q: 'What is "blood on hands"?', a: ['Injury', 'Eviction guilt', 'Actual blood', 'Violence'], correct: 1 },
    { q: 'What is a "comp beast"?', a: ['Animal', 'Strong player', 'Competition winner', 'Frequent winner'], correct: 3 },
    
    // Advanced Strategy (Medium/Hard)
    { q: 'What is "flipping the house"?', a: ['Renovating', 'Changing votes', 'Evicting HOH', 'Winning all'], correct: 1 },
    { q: 'What does "laying low" mean?', a: ['Sleeping', 'Avoiding attention', 'Losing comps', 'Quitting'], correct: 1 },
    { q: 'What is a "power alliance"?', a: ['Electric group', 'Dominant alliance', 'HOH team', 'Winners'], correct: 1 },
    { q: 'What is a "bitter jury"?', a: ['Angry jurors', 'Bad losers', 'Personal voting', 'All of these'], correct: 3 },
    { q: 'What is a "goat"?', a: ['Animal', 'Weak finalist', 'Winner', 'Villain'], correct: 1 },
    { q: 'What does "cutting someone" mean?', a: ['Injury', 'Evicting ally', 'Nomination', 'Betrayal'], correct: 1 },
    { q: 'What is "sitting pretty"?', a: ['Posing', 'Safe position', 'Winning', 'Relaxing'], correct: 1 },
    { q: 'What is a "vote flip"?', a: ['Coin toss', 'Changing vote', 'Gymnastics', 'Betrayal'], correct: 1 },
    
    // Game Phases & Events (Medium)
    { q: 'What is the "Final 2"?', a: ['Last two players', 'Final comp', 'Last vote', 'Finale episode'], correct: 0 },
    { q: 'What is the "Final HOH"?', a: ['Last comp', '3-part comp', 'Chooses F2', 'All of these'], correct: 3 },
    { q: 'What is "pre-jury"?', a: ['Before game', 'Before jury phase', 'Early eviction', 'First week'], correct: 1 },
    { q: 'What is a "double eviction"?', a: ['Two nominees', 'Two evictions', 'Two HOHs', 'Two vetoes'], correct: 1 },
    { q: 'What is "jury phase"?', a: ['Trial', 'When jury forms', 'Final weeks', 'Voting period'], correct: 1 },
    { q: 'What is "making jury"?', a: ['Creating jury', 'Lasting to jury', 'Joining jury', 'Winning game'], correct: 2 },
    { q: 'What is the "Jury Roundtable"?', a: ['Table shape', 'Jury discussion', 'Voting area', 'Final comp'], correct: 1 },
    
    // Competitions & Challenges (Medium)
    { q: 'What is a "Battle Back"?', a: ['Fight', 'Return comp', 'Revenge', 'Backstab'], correct: 1 },
    { q: 'What type is an endurance comp?', a: ['Quick', 'Long-lasting', 'Mental', 'Physical'], correct: 1 },
    { q: 'What is a mental comp?', a: ['Days comp', 'Memory test', 'Quiz', 'All of these'], correct: 3 },
    { q: 'What is a physical comp?', a: ['Running', 'Strength', 'Endurance', 'All of these'], correct: 3 },
    { q: 'What happens at POV ceremony?', a: ['Nominations', 'Veto decision', 'Eviction', 'Vote'], correct: 1 },
    { q: 'What is a "knockout" comp?', a: ['Boxing', 'Elimination style', 'Physical', 'Mental'], correct: 1 },
    
    // Social Game & Alliances (Medium)
    { q: 'What is an "alliance"?', a: ['Marriage', 'Group together', 'Comp team', 'Vote bloc'], correct: 1 },
    { q: 'What is "social game"?', a: ['Parties', 'Relationships', 'Competitions', 'Strategy'], correct: 1 },
    { q: 'What is "campaigning"?', a: ['Running', 'Asking votes', 'Competing', 'Arguing'], correct: 1 },
    { q: 'What is a "mastermind"?', a: ['Smart player', 'Strategic leader', 'Comp winner', 'Manipulator'], correct: 1 },
    { q: 'What is a "target"?', a: ['Goal', 'Eviction target', 'Prize', 'Bullseye'], correct: 1 },
    { q: 'What is "making deals"?', a: ['Shopping', 'Negotiating', 'Trading', 'Card games'], correct: 1 },
    { q: 'What does "throwing under bus" mean?', a: ['Violence', 'Blaming others', 'Accident', 'Strategy'], correct: 1 },
    
    // Voting & Nominations (Easy/Medium)
    { q: 'What is "the Block"?', a: ['Punishment', 'Nomination seats', 'Voting area', 'Time limit'], correct: 1 },
    { q: 'What is a unanimous vote?', a: ['Close vote', 'All agree', 'Tie vote', 'No vote'], correct: 1 },
    { q: 'When is the veto ceremony?', a: ['Before noms', 'After POV comp', 'Eviction night', 'Finale'], correct: 1 },
    { q: 'What happens if POV is used?', a: ['Nothing', 'Replacement nom', 'Week ends', 'No eviction'], correct: 1 },
    { q: 'Who can use the veto?', a: ['Anyone', 'POV winner', 'HOH only', 'Nominees'], correct: 1 },
    { q: 'What are jury votes for?', a: ['Evictions', 'Winner decision', 'Nominations', 'America'], correct: 1 },
    
    // Special Events & Twists (Medium/Hard)
    { q: 'What is a "twist"?', a: ['Dance move', 'Rule change', 'Turn', 'Strategy'], correct: 1 },
    { q: 'What is "America\'s Vote"?', a: ['Election', 'Viewer influence', 'HOH comp', 'Jury vote'], correct: 1 },
    { q: 'What are "Have-Nots"?', a: ['Losers', 'Food restriction', 'Nominees', 'Jury'], correct: 1 },
    { q: 'What is the prize money?', a: ['$100K', '$250K', '$500K', '$1M'], correct: 2 },
  ];

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;gap:16px;padding:20px;max-width:500px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Big Brother Trivia';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;text-align:center;';
    
    const progress = document.createElement('div');
    progress.style.cssText = 'font-size:0.85rem;color:#95a9c0;text-align:center;';
    
    const questionText = document.createElement('div');
    questionText.style.cssText = 'font-size:1rem;color:#e3ecf5;min-height:60px;text-align:center;padding:10px;';
    
    const answersContainer = document.createElement('div');
    answersContainer.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
    
    let currentQuestion = 0;
    let correctAnswers = 0;
    const totalQuestions = 5; // Ask 5 random questions
    const selectedQuestions = [];
    
    // Select random questions
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
    for(let i = 0; i < Math.min(totalQuestions, shuffled.length); i++){
      selectedQuestions.push(shuffled[i]);
    }
    
    function showQuestion(){
      if(currentQuestion >= selectedQuestions.length){
        // Quiz complete
        const score = Math.max(20, Math.min(100, (correctAnswers / selectedQuestions.length) * 80 + 20));
        
        questionText.textContent = 'Quiz Complete!';
        answersContainer.innerHTML = '';
        progress.textContent = `You got ${correctAnswers} out of ${selectedQuestions.length} correct!`;
        
        setTimeout(() => {
          onComplete(score);
        }, 2000);
        return;
      }
      
      const question = selectedQuestions[currentQuestion];
      progress.textContent = `Question ${currentQuestion + 1} of ${selectedQuestions.length}`;
      questionText.textContent = question.q;
      answersContainer.innerHTML = '';
      
      question.a.forEach((answer, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = answer;
        btn.style.cssText = 'padding:12px 20px;text-align:left;font-size:0.95rem;';
        
        btn.addEventListener('click', () => {
          // Disable all buttons
          answersContainer.querySelectorAll('button').forEach(b => b.disabled = true);
          
          if(index === question.correct){
            // Correct!
            btn.style.background = '#77d58d';
            btn.style.color = '#fff';
            correctAnswers++;
          } else {
            // Wrong
            btn.style.background = '#ff6d6d';
            btn.style.color = '#fff';
            // Highlight correct answer
            answersContainer.querySelectorAll('button')[question.correct].style.background = '#77d58d';
            answersContainer.querySelectorAll('button')[question.correct].style.color = '#fff';
          }
          
          setTimeout(() => {
            currentQuestion++;
            showQuestion();
          }, 1500);
        }, { passive: false });
        
        answersContainer.appendChild(btn);
      });
    }
    
    wrapper.appendChild(title);
    wrapper.appendChild(progress);
    wrapper.appendChild(questionText);
    wrapper.appendChild(answersContainer);
    container.appendChild(wrapper);
    
    showQuestion();
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.triviaQuiz = { render };

})(window);
