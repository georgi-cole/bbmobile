// MODULE: minigames/trivia-quiz.js
// Trivia Quiz - Answer multiple choice questions

(function(g){
  'use strict';

  const QUESTIONS = [
    { q: 'What year was Big Brother first aired in the US?', a: ['2000', '1999', '2001', '2002'], correct: 0 },
    { q: 'How many houseguests typically start each season?', a: ['12', '14', '16', '18'], correct: 2 },
    { q: 'What does HOH stand for?', a: ['Head of House', 'Head of Household', 'House of Honor', 'Hero of House'], correct: 1 },
    { q: 'How many nominees are typically put up each week?', a: ['1', '2', '3', '4'], correct: 1 },
    { q: 'What competition can save a nominee?', a: ['HOH', 'Veto', 'Jury', 'Vote'], correct: 1 },
    { q: 'Where do evicted players go after jury starts?', a: ['Home', 'Jury House', 'Sequester', 'Hotel'], correct: 1 },
    { q: 'Who votes in the finale?', a: ['America', 'Host', 'Jury', 'Nominees'], correct: 2 },
    { q: 'What is a "backdoor" in Big Brother?', a: ['Exit door', 'Secret room', 'Veto strategy', 'Alliance name'], correct: 2 },
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
