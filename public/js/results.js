// Calculate and update statistics
document.addEventListener('DOMContentLoaded', function() {
  const results = window.resultsData.results;
  const electionStartDate = window.resultsData.electionStartDate;
  const electionEndDate = window.resultsData.electionEndDate;

  // Sort results by votes (descending) to match the EJS sorting
  const sortedResults = [...results].sort((a, b) => parseInt(b.votes) - parseInt(a.votes));

  const totalVotes = sortedResults.reduce((sum, result) => sum + parseInt(result.votes), 0);

  // Find leading party (handle ties)
  let leadingParty = '-';
  let maxVotes = 0;
  let tieCount = 0;

  sortedResults.forEach(result => {
    const votes = parseInt(result.votes);
    if (votes > maxVotes) {
      maxVotes = votes;
      leadingParty = result.party;
      tieCount = 1;
    } else if (votes === maxVotes) {
      tieCount++;
      leadingParty = tieCount > 1 ? 'Tie' : result.party;
    }
  });

  // Update hero stats
  document.getElementById('total-votes').textContent = totalVotes.toLocaleString();
  document.getElementById('leading-party').textContent = leadingParty;

  // Update summary stats
  document.getElementById('summary-total').textContent = totalVotes.toLocaleString();

  // Calculate and update voter turnout
  const totalVoters = window.resultsData.totalVoters || 0;
  const turnout = totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(1) : 0;
  document.getElementById('summary-turnout').textContent = turnout + '%';

  // Show tie message if there's a tie
  const tieMessage = document.getElementById('tie-message');
  if (tieCount > 1) {
    tieMessage.style.display = 'block';
  } else {
    tieMessage.style.display = 'none';
  }

  // Update progress bars and percentages
  const resultCards = document.querySelectorAll('.result-card');
  resultCards.forEach((card, index) => {
    const partyName = card.querySelector('.party-name').textContent.trim();
    const result = sortedResults.find(r => r.party === partyName);
    if (result) {
      const percentage = totalVotes > 0 ? ((parseInt(result.votes) / totalVotes) * 100).toFixed(1) : 0;
      const progressBar = card.querySelector('.progress-bar');
      const percentageElement = card.querySelector('.percentage');

      if (progressBar) {
        progressBar.setAttribute('data-percentage', percentage);
        setTimeout(() => {
          progressBar.style.width = percentage + '%';
        }, 500 + (index * 100));
      }

      if (percentageElement) {
        percentageElement.textContent = percentage + '%';
      }
    }
  });

  // Initialize countdown timer
  if (electionStartDate || electionEndDate) {
    initializeCountdown(electionStartDate, electionEndDate);
  }
});

function initializeCountdown(startDate, endDate) {
  const countdownContainer = document.getElementById('countdown-container');
  const countdownTitle = document.getElementById('countdown-title');
  const now = new Date();

  // Parse dates to Date objects
  startDate = startDate ? new Date(startDate) : null;
  endDate = endDate ? new Date(endDate) : null;

  let targetDate = null;
  let title = '';

  if (startDate && now < startDate) {
    targetDate = startDate;
    title = 'Election Starts In';
  } else if (endDate && now < endDate) {
    targetDate = endDate;
    title = 'Election Ends In';
  } else if (endDate && now > endDate) {
    title = 'Election Has Ended';
    countdownContainer.style.display = 'block';
    countdownTitle.textContent = title;
    return;
  } else {
    return; // No countdown needed
  }

  if (targetDate) {
    countdownContainer.style.display = 'block';
    countdownTitle.textContent = title;
    updateCountdown(targetDate);

    // Update countdown every second
    setInterval(() => updateCountdown(targetDate), 1000);
  }
}

function updateCountdown(targetDate) {
  const now = new Date();
  const timeLeft = targetDate - now;

  if (timeLeft <= 0) {
    document.getElementById('days').textContent = '00';
    document.getElementById('hours').textContent = '00';
    document.getElementById('minutes').textContent = '00';
    document.getElementById('seconds').textContent = '00';
    return;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  document.getElementById('days').textContent = days.toString().padStart(2, '0');
  document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
  document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
  document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
}
