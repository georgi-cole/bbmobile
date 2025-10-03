// MODULE: minigames/trivia-pulse.js
// Trivia Pulse - Time-pressured Big Brother trivia with score multipliers

(function(g){
  'use strict';

  const STORAGE_KEY = 'bb_sp_competitions_v1';

  function saveScore(gameName, score){
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if(!data[gameName] || score > data[gameName]){
        data[gameName] = score;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch(e){}
  }

  function loadBestScore(gameName){
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return data[gameName] || 0;
    } catch(e){
      return 0;
    }
  }

  const QUESTIONS = [
    { q: 'What year was Big Brother first aired in the US?', a: ['2000', '1999', '2001', '2002'], correct: 0, difficulty: 'easy' },
    { q: 'How many houseguests typically start each season?', a: ['12', '14', '16', '18'], correct: 2, difficulty: 'easy' },
    { q: 'What does HOH stand for?', a: ['Head of House', 'Head of Household', 'House of Honor', 'Hero of House'], correct: 1, difficulty: 'easy' },
    { q: 'How many nominees are typically put up each week?', a: ['1', '2', '3', '4'], correct: 1, difficulty: 'easy' },
    { q: 'What competition can save a nominee?', a: ['HOH', 'Veto', 'Jury', 'Vote'], correct: 1, difficulty: 'easy' },
    { q: 'Where do evicted players go after jury starts?', a: ['Home', 'Jury House', 'Sequester', 'Hotel'], correct: 1, difficulty: 'medium' },
    { q: 'Who votes in the finale?', a: ['America', 'Host', 'Jury', 'Nominees'], correct: 2, difficulty: 'easy' },
    { q: 'What is a "backdoor" in Big Brother?', a: ['Exit door', 'Secret room', 'Veto strategy', 'Alliance name'], correct: 2, difficulty: 'medium' },
    { q: 'How many jury members typically vote?', a: ['7', '9', '5', '11'], correct: 1, difficulty: 'medium' },
    { q: 'What is a "floater" in Big Brother?', a: ['Pool toy', 'Strategic player', 'Loyalty player', 'Non-aligned player'], correct: 3, difficulty: 'medium' },
    { q: 'What happens during a double eviction?', a: ['Two nominees', 'Two evictions', 'Two HOHs', 'Two vetoes'], correct: 1, difficulty: 'medium' },
    { q: 'Who typically cannot compete in HOH?', a: ['Previous HOH', 'Nominees', 'Veto winner', 'Jury'], correct: 0, difficulty: 'easy' },
  ];

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;gap:12px;padding:20px;max-width:500px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Trivia Pulse';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;text-align:center;';
    
    const bestScore = loadBestScore('triviaPulse');
    const bestDisplay = document.createElement('div');
    bestDisplay.textContent = `Best: ${Math.round(bestScore)}`;
    bestDisplay.style.cssText = 'font-size:0.75rem;color:#95a9c0;text-align:center;';
    
    const progressBar = document.createElement('div');
    progressBar.style.cssText = 'width:100%;height:8px;background:#1d2734;border-radius:4px;overflow:hidden;';
    const progressFill = document.createElement('div');
    progressFill.style.cssText = 'height:100%;background:#83bfff;width:100%;transition:width 0.1s linear;';
    progressBar.appendChild(progressFill);
    
    const questionCounter = document.createElement('div');
    questionCounter.style.cssText = 'font-size:0.85rem;color:#95a9c0;text-align:center;';
    
    const questionText = document.createElement('div');
    questionText.style.cssText = 'font-size:1.05rem;color:#e3ecf5;min-height:70px;text-align:center;padding:16px;background:#1d2734;border-radius:8px;';
    
    const answersContainer = document.createElement('div');
    answersContainer.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.cssText = 'font-size:0.9rem;color:#83bfff;text-align:center;min-height:25px;';
    
    let currentQuestion = 0;
    let totalScore = 0;
    let correctCount = 0;
    const totalQuestions = 6;
    const selectedQuestions = [];
    let questionStartTime = 0;
    let timeLimit = 15000; // 15 seconds per question
    let timerInterval = null;
    let gameActive = false;
    let isPaused = false;
    let pauseStartTime = 0;
    
    // Pause on visibility change
    function handleVisibilityChange(){
      if(document.hidden && gameActive){
        isPaused = true;
        pauseStartTime = Date.now();
        clearInterval(timerInterval);
        scoreDisplay.textContent = 'Game paused...';
      } else if(isPaused && gameActive){
        isPaused = false;
        const pauseDuration = Date.now() - pauseStartTime;
        questionStartTime += pauseDuration; // Extend time by pause duration
        startTimer();
        scoreDisplay.textContent = '';
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Select random questions
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
    for(let i = 0; i < Math.min(totalQuestions, shuffled.length); i++){
      selectedQuestions.push(shuffled[i]);
    }
    
    function startTimer(){
      if(timerInterval) clearInterval(timerInterval);
      
      timerInterval = setInterval(() => {
        if(isPaused) return;
        
        const elapsed = Date.now() - questionStartTime;
        const remaining = Math.max(0, timeLimit - elapsed);
        const percent = (remaining / timeLimit) * 100;
        
        progressFill.style.width = percent + '%';
        
        if(percent < 30){
          progressFill.style.background = '#ff6d6d';
        } else if(percent < 60){
          progressFill.style.background = '#f7b955';
        } else {
          progressFill.style.background = '#83bfff';
        }
        
        if(remaining <= 0){
          clearInterval(timerInterval);
          handleTimeout();
        }
      }, 50);
    }
    
    function handleTimeout(){
      answersContainer.querySelectorAll('button').forEach(b => b.disabled = true);
      scoreDisplay.textContent = 'Time\'s up! 0 points';
      
      setTimeout(() => {
        currentQuestion++;
        showQuestion();
      }, 1500);
    }
    
    function showQuestion(){
      if(currentQuestion >= selectedQuestions.length){
        finishGame();
        return;
      }
      
      gameActive = true;
      const question = selectedQuestions[currentQuestion];
      questionCounter.textContent = `Question ${currentQuestion + 1} of ${selectedQuestions.length}`;
      questionText.textContent = question.q;
      answersContainer.innerHTML = '';
      scoreDisplay.textContent = `Score: ${Math.round(totalScore)}`;
      
      questionStartTime = Date.now();
      progressFill.style.width = '100%';
      startTimer();
      
      question.a.forEach((answer, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = answer;
        btn.style.cssText = 'padding:12px 20px;text-align:left;font-size:0.95rem;transition:all 0.2s;';
        
        btn.addEventListener('click', () => {
          clearInterval(timerInterval);
          answersContainer.querySelectorAll('button').forEach(b => b.disabled = true);
          
          const elapsed = Date.now() - questionStartTime;
          const timeBonus = Math.max(0, (timeLimit - elapsed) / timeLimit);
          
          if(index === question.correct){
            // Correct!
            btn.style.background = '#77d58d';
            btn.style.color = '#fff';
            correctCount++;
            
            // Base points: 10, Time bonus: up to 6.67 points per correct
            const points = 10 + (timeBonus * 6.67);
            totalScore += points;
            scoreDisplay.textContent = `+${points.toFixed(1)} points! (${(timeBonus * 100).toFixed(0)}% time bonus)`;
          } else {
            // Wrong
            btn.style.background = '#ff6d6d';
            btn.style.color = '#fff';
            answersContainer.querySelectorAll('button')[question.correct].style.background = '#77d58d';
            answersContainer.querySelectorAll('button')[question.correct].style.color = '#fff';
            scoreDisplay.textContent = '0 points - Incorrect';
          }
          
          setTimeout(() => {
            currentQuestion++;
            showQuestion();
          }, 1800);
        }, { passive: false });
        
        answersContainer.appendChild(btn);
      });
    }
    
    function finishGame(){
      gameActive = false;
      clearInterval(timerInterval);
      
      questionText.textContent = '🎉 Quiz Complete! 🎉';
      answersContainer.innerHTML = '';
      questionCounter.textContent = '';
      progressBar.style.display = 'none';
      
      // Normalize to 0-100: Perfect score is 100 (6 questions x 16.67 points each)
      const maxPossibleScore = totalQuestions * 16.67;
      const normalizedScore = Math.min(100, (totalScore / maxPossibleScore) * 100);
      
      scoreDisplay.innerHTML = `
        <div style="font-size:1.1rem;margin:10px 0;">Correct: ${correctCount}/${selectedQuestions.length}</div>
        <div style="font-size:1.3rem;color:#83bfff;">Final Score: ${Math.round(normalizedScore)}</div>
      `;
      
      // Save best score
      saveScore('triviaPulse', normalizedScore);
      
      // Cleanup
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      setTimeout(() => {
        onComplete(normalizedScore);
      }, 2500);
    }
    
    wrapper.appendChild(title);
    wrapper.appendChild(bestDisplay);
    wrapper.appendChild(progressBar);
    wrapper.appendChild(questionCounter);
    wrapper.appendChild(questionText);
    wrapper.appendChild(answersContainer);
    wrapper.appendChild(scoreDisplay);
    container.appendChild(wrapper);
    
    showQuestion();
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.triviaPulse = { render };

})(window);
