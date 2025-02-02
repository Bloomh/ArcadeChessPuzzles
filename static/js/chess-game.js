// Initialize global variables
let board = null;
let game = new Chess();
let currentPuzzle = null;
let puzzleTimer = null;
let gameStartTime = null;  // Track when the game session started
let currentScore = 0;
let highScore = 0;
let streak = 0;
let puzzlesSolved = 0;
let startTime = null;
let puzzleTimeLimit = 30; // Will be set by difficulty selection
let currentPuzzleRevealed = false;
let lastThousandMilestone = 0;
const BASE_POINTS = 100;
const TIME_BONUS_MULTIPLIER = 2;
const STREAK_BONUS = 50;
const PENALTY_POINTS = 500;

// Utility functions
function getPieceName(piece) {
    const pieceMap = {
        'p': 'pawn',
        'r': 'rook',
        'n': 'knight',
        'b': 'bishop',
        'q': 'queen',
        'k': 'king'
    };
    return pieceMap[piece.toLowerCase()];
}

function removeHighlights() {
    $('#board .square-55d63').removeClass('highlight-valid-move');
}

function highlightValidMoves(square) {
    // Get list of valid moves for the piece
    var moves = game.moves({ square: square, verbose: true });
    
    // Highlight each valid destination square
    moves.forEach(function(move) {
        var $square = $('#board .square-55d63[data-square="' + move.to + '"]');
        $square.addClass('highlight-valid-move');
    });
}

function formatMove(moveUci) {
    const from = moveUci.substring(0, 2);
    const to = moveUci.substring(2, 4);
    const move = game.move({ from, to, promotion: 'q' });
    if (move) {
        game.undo();
        return move.san; // Return algebraic notation
    }
    return moveUci; // Fallback to UCI notation
}

function formatTime(seconds) {
    if (seconds === -1) return '∞';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatTimeLeft(timeLeft) {
    if (puzzleTimeLimit === -1) return '';
    const minutes = Math.floor(timeLeft / 60);
    const seconds = Math.floor(timeLeft % 60);
    if (minutes === 0) {
        return `${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
}

function showStatus(message, type) {
    const $status = $('#status');
    $status
        .html(message)
        .css({
            'color': type === 'success' ? '#00ff00' : '#ff0000',
            'border': `2px solid ${type === 'success' ? '#00ff00' : '#ff0000'}`,
            'text-shadow': '2px 2px #000',
        })
        .addClass('show');

    setTimeout(() => {
        $status.removeClass('show');
    }, 1500);
}

// Achievement handling
function getRandomAnimation() {
    const animations = ['matrix', 'rainbow', 'rotate'];
    return animations[Math.floor(Math.random() * animations.length)];
}

function getRandomIconAnimation() {
    const animations = ['sparkle', 'bounce', 'shake'];
    return animations[Math.floor(Math.random() * animations.length)];
}

function showMilestone(title, text, subtext = '', duration = 3000) {
    const $overlay = $('.milestone-overlay');
    const $content = $('.milestone-content');
    const $text = $('.milestone-text');
    const $subtext = $('.milestone-subtext');
    const $icons = $('.milestone-icon');
    
    // Reset classes
    $content.removeClass('matrix rainbow rotate');
    $icons.removeClass('sparkle bounce shake');
    
    // Add random animations
    $content.addClass(getRandomAnimation());
    $icons.each(function() {
        $(this).addClass(getRandomIconAnimation());
    });
    
    $text.text(text);
    $subtext.text(subtext);
    $overlay.addClass('show');
    
    // Play retro sound effect
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBkCU1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTqO0vDTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnMpBSl+zPDaizsIGGS57OihUBELTKXh8bllHgY8ktXxz38xBSF1xe/glEILElyx6OyrWBUIQ5zd8sFuJAU3jdDv1oU2Bhxqvu7mnEoODlOq5O+zYBoIPJPY8cp2KwUme8rx3Y4+CRZiturqpVITCkmi4PK8aCAGOY/U8NKCMwYea8Dv45xLDg1TrOfvsl0YCDyV2fLIdigFJX3N8duNPQkXY7fq6qNREwpKouDyvGkhBjiP0/DTgjQGHWzB7+ObSg4OU6zn77JeGQc8ltnyx3YoBSZ9zvDajj4JF2S36uqjURELS6Lg8rxpIQY4j9Pw04I0Bh1swe/jm0oODlOs5++yXhkHPJbZ8sd2KAUmfc7w2o4+CRdkt+rqo1ERDEui4PK8aSEGOI/T8NOCNAYdbMHv45tKDg5TrOfvsl4ZBzyW2fLHdigFJn3O8NqOPgkXZLfq6qNREQxLouDyvGkhBjiP0/DTgjQGHWzB7+ObSg4OU6zn77JeGQc8ltnyx3YoBSZ9zvDajj4JF2S36uqjUREMS6Lg8rxpIQY4j9Pw04I0Bh1swe/jm0oODlOs5++yXhkI=');
    audio.play();
    
    setTimeout(() => {
        $overlay.removeClass('show');
    }, duration);
}

function showAchievementBanner(text, duration = 2000) {
    const $banner = $('.achievement-banner');
    const animation = getRandomAnimation();
    
    $banner.removeClass('rainbow matrix bounce')
           .addClass(animation)
           .text(text)
           .addClass('show');
    
    setTimeout(() => {
        $banner.removeClass('show ' + animation);
    }, duration);
}

function getStreakMessage(streak) {
    const messages = [
        { threshold: 20, text: "UNSTOPPABLE! 🔥", icon: "🏆" },
        { threshold: 15, text: "AMAZING! ⚡", icon: "⚡" },
        { threshold: 10, text: "INCREDIBLE! 🌟", icon: "🌟" },
        { threshold: 5, text: "AWESOME! 🎯", icon: "🎯" }
    ];
    
    for (const msg of messages) {
        if (streak >= msg.threshold) {
            return `${msg.icon} ${streak} STREAK ${msg.icon} ${msg.text}`;
        }
    }
    return `${streak} PUZZLE STREAK! 🎯`;
}

function getHighScoreMessage(score) {
    const messages = [
        { threshold: 10000, text: "GRANDMASTER STATUS!", subtext: "You're in the hall of fame!" },
        { threshold: 5000, text: "LEGENDARY!", subtext: "You're making chess history!" },
        { threshold: 3000, text: "EXTRAORDINARY!", subtext: "Your skills are unmatched!" },
        { threshold: 1000, text: "IMPRESSIVE!", subtext: "You're rising through the ranks!" }
    ];
    
    for (const msg of messages) {
        if (score >= msg.threshold) {
            return {
                text: `${score} POINTS - ${msg.text}`,
                subtext: msg.subtext
            };
        }
    }
    return {
        text: `${score} POINTS - NEW RECORD!`,
        subtext: "Keep pushing higher!"
    };
}

function checkHighScoreMilestone(newHighScore, prevHighScore) {
    const currentThousand = Math.floor(newHighScore / 1000);
    const prevThousand = Math.floor(prevHighScore / 1000);
    
    if (currentThousand > prevThousand) {
        const message = getHighScoreMessage(currentThousand * 1000);
        showMilestone(
            'NEW HIGH SCORE!',
            message.text,
            message.subtext
        );
        lastThousandMilestone = currentThousand * 1000;
    }
}

function checkStreakMilestone() {
    if (streak > 0 && streak % 5 === 0) {
        showAchievementBanner(getStreakMessage(streak));
    }
}

// Scoring system functions
function updateScore(points) {
    currentScore = Math.max(0, currentScore + points);
    $('#score').html(currentScore);
    
    if (currentScore > highScore) {
        const prevHighScore = highScore;
        highScore = currentScore;
        $('#high-score').html(highScore);
        $('#high-score').css('animation', 'blink 0.5s step-end 3');
        setTimeout(() => {
            $('#high-score').css('animation', '');
        }, 1500);
        
        // Check high score milestones
        checkHighScoreMilestone(highScore, prevHighScore);
    }
}

function penalizeScore() {
    updateScore(-PENALTY_POINTS);
    updateStreak(false);
}

function resetScore() {
    currentScore = 0;
    $('#score').html('0');
    streak = 0;
    $('#streak').html('0').removeClass('streak-bonus');
}

function updateStreak(success) {
    if (success) {
        streak++;
        if (streak > 1) {
            $('#streak').addClass('streak-bonus');
        }
        checkStreakMilestone();
    } else {
        streak = 0;
        $('#streak').removeClass('streak-bonus');
    }
    $('#streak').html(streak);
}

function updatePuzzlesSolved() {
    puzzlesSolved++;
    $('#puzzles-solved').html(puzzlesSolved);
}

function calculateTimeBonus(timeSpent) {
    const timeLeft = puzzleTimeLimit - timeSpent;
    return Math.max(0, Math.floor(timeLeft * TIME_BONUS_MULTIPLIER));
}

function startTimer() {
    // Initialize game timer if not started
    if (!gameStartTime) {
        gameStartTime = Date.now();
        
        if (puzzleTimeLimit === -1) {
            $('#timer-progress').css('width', '100%');
            $('.stat-label').filter(function() {
                return $(this).text() === 'TIME LEFT';
            }).text('UNTIMED');
            return;
        }
        
        const timerProgress = $('#timer-progress');
        timerProgress.css('width', '100%');
        
        // Reset timer label
        $('.stat-label').filter(function() {
            return $(this).text() === 'UNTIMED';
        }).text('TIME LEFT');
        
        puzzleTimer = setInterval(() => {
            const timeSpent = (Date.now() - gameStartTime) / 1000;
            const timeLeft = Math.max(0, puzzleTimeLimit - timeSpent);
            const percentLeft = (timeLeft / puzzleTimeLimit) * 100;
            
            timerProgress.css('width', percentLeft + '%');
            
            // Update time display
            if (timeLeft > 0) {
                $('#timer-display').text(formatTimeLeft(timeLeft));
            }
            
            if (timeSpent >= puzzleTimeLimit) {
                clearInterval(puzzleTimer);
                handlePuzzleTimeout();
            }
        }, 100);
    }
    
    // Update startTime for scoring purposes
    startTime = Date.now();
}

function handlePuzzleTimeout() {
    if (puzzleTimer) {
        clearInterval(puzzleTimer);
    }
    showGameOver();
}

function showGameOver() {
    // Hide all game elements
    $('#game-container').hide();
    $('#game-stats').hide();
    
    // Show game over screen with flex display
    $('#game-over-screen').css('display', 'flex');
    
    // Update final stats
    $('#final-high-score').text(highScore);
    $('#final-score').text(currentScore);
    $('#final-puzzles-solved').text(puzzlesSolved);
    $('#final-streak').text(streak);
    
    // Clear the board
    board.clear();
    
    // Disable board interactions
    board.draggable = false;
}

function resetGame() {
    // Reset all game variables
    currentScore = 0;
    streak = 0;
    puzzlesSolved = 0;
    startTime = null;
    gameStartTime = null;
    currentPuzzleRevealed = false;
    
    // Reset UI
    $('#score-value').text('0');
    $('#streak-value').text('0');
    $('#puzzles-solved-value').text('0');
    
    // Hide game over screen and show difficulty selection
    $('#game-over-screen').css('display', 'none');
    $('#game-container').hide();
    $('#game-stats').show();
    $('#difficulty-select').show();
    
    // Reset and re-enable board
    board.start();
    board.draggable = true;
    
    // Clear any remaining timer
    if (puzzleTimer) {
        clearInterval(puzzleTimer);
    }
}

function showCorrectMove() {
    if (!currentPuzzle || !currentPuzzle.best_move) return;
    
    const bestMove = formatMove(currentPuzzle.best_move);
    const from = currentPuzzle.best_move.substring(0, 2);
    const to = currentPuzzle.best_move.substring(2, 4);
    
    // Highlight the correct squares
    $('.square-55d63').removeClass('highlight-solution');
    $(`[data-square="${from}"]`).addClass('highlight-solution');
    $(`[data-square="${to}"]`).addClass('highlight-solution');
    
    return bestMove;
}

// Event handlers
function onDragStart(source, piece, position, orientation) {
    if (game.game_over()) return false;

    // Only allow the correct color pieces to be moved
    if (currentPuzzle && currentPuzzle.turn) {
        const playerColor = currentPuzzle.turn;
        if (piece.search(new RegExp('^' + playerColor)) === -1) return false;
    }
}

function onDrop(source, target) {
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    if (move === null) return 'snapback';

    // Check if the move matches the puzzle solution
    if (currentPuzzle && currentPuzzle.best_move) {
        const moveUci = move.from + move.to;
        if (moveUci === currentPuzzle.best_move) {
            const timeSpent = (Date.now() - startTime) / 1000;
            // Check time limit only if not in untimed mode
            if (puzzleTimeLimit === -1 || timeSpent <= puzzleTimeLimit) {
                if (!currentPuzzleRevealed) {
                    const timeBonus = puzzleTimeLimit === -1 ? 0 : calculateTimeBonus(timeSpent);
                    const streakBonus = streak * STREAK_BONUS;
                    const totalPoints = BASE_POINTS + timeBonus + streakBonus;
                    
                    updateScore(totalPoints);
                    updateStreak(true);
                    updatePuzzlesSolved();
                    
                    showStatus(`Correct! +${totalPoints} points!`, 'success');
                } else {
                    showStatus('Correct! (No points - solution was revealed)', 'success');
                }
                
                setTimeout(loadNewPuzzle, 1500);
            }
            return;
        }
    }

    game.undo();
    board.position(game.fen());
    penalizeScore();
    showStatus('Incorrect move. -500 points!', 'error');
}

function onSnapEnd() {
    board.position(game.fen());
}

function onMouseoverSquare(square, piece) {
    if (piece) {
        // Only show valid moves for the correct color
        if (currentPuzzle && currentPuzzle.turn) {
            const playerColor = currentPuzzle.turn;
            if (piece.search(new RegExp('^' + playerColor)) === -1) return;
        }
        highlightValidMoves(square);
    }
}

function onMouseoutSquare(square, piece) {
    removeHighlights();
}

// Initialize board when document is ready
$(document).ready(function() {
    // Handle difficulty selection
    $('.difficulty-option').on('click', function() {
        $('.difficulty-option').removeClass('selected');
        $(this).addClass('selected');
        puzzleTimeLimit = parseInt($(this).data('seconds'));
        gameStartTime = null;  // Reset game start time when changing difficulty
    });

    // Set default difficulty
    $('.difficulty-option[data-seconds="30"]').addClass('selected');
    puzzleTimeLimit = 30;

    // Handle username submission
    $('#submit-username').on('click', function() {
        const username = $('#username').val();
        if (!username) {
            showStatus('Please enter a username', 'error');
            return;
        }

        if (!$('.difficulty-option.selected').length) {
            showStatus('Please select a time limit', 'error');
            return;
        }

        // Get selected time limit
        puzzleTimeLimit = parseInt($('.difficulty-option.selected').data('seconds'));

        // Disable button and show loading state
        const $button = $(this);
        $button.prop('disabled', true);
        $button.find('.button-text').addClass('hidden');
        $button.find('.loading-text').removeClass('hidden').addClass('loading');

        $.ajax({
            url: '/set_username',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username: username }),
            success: function(response) {
                $('#username-form').hide();
                $('#puzzle-container').show();
                loadNewPuzzle();
            },
            error: function(xhr) {
                showStatus('Error: ' + xhr.responseJSON.error, 'error');
                // Re-enable button
                $button.prop('disabled', false);
                $button.find('.button-text').removeClass('hidden');
                $button.find('.loading-text').addClass('hidden').removeClass('loading');
            }
        });
    });

    // Initialize the chess board
    var config = {
        draggable: true,
        position: 'start',
        orientation: 'white',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        onMouseoverSquare: onMouseoverSquare,
        onMouseoutSquare: onMouseoutSquare,
        pieceTheme: function(piece) {
            var color = piece.charAt(0) === 'w' ? 'white' : 'black';
            return `/static/images/${color}_${getPieceName(piece.charAt(1))}.svg`;
        }
    };

    board = Chessboard('board', config);

    // Handle new puzzle button
    $('#newPuzzle').on('click', function() {
        const $button = $(this);
        $button.prop('disabled', true);
        $button.find('.button-text').addClass('hidden');
        $button.find('.loading-text').removeClass('hidden').addClass('loading');
        loadNewPuzzle();
    });
    
    // Handle reveal solution button
    $('#revealSolution').on('click', function() {
        if (!currentPuzzle || !currentPuzzle.best_move) return;
        
        currentPuzzleRevealed = true; // Mark puzzle as revealed
        const bestMove = formatMove(currentPuzzle.best_move);
        showStatus(`The best move is: ${bestMove}`, 'success');
        
        const from = currentPuzzle.best_move.substring(0, 2);
        const to = currentPuzzle.best_move.substring(2, 4);
        $('.square-55d63').removeClass('highlight-solution');
        $(`[data-square="${from}"]`).addClass('highlight-solution');
        $(`[data-square="${to}"]`).addClass('highlight-solution');
    });
    
    // Handle play again button
    $('#play-again').on('click', function() {
        resetGame();
    });
});

// Load a new puzzle
function loadNewPuzzle() {
    currentPuzzleRevealed = false; // Reset revealed state for new puzzle
    
    // Clear any previous solution highlights
    $('.square-55d63').removeClass('highlight-solution');
    
    $.get('/get_puzzle', function(data) {
        if (data.error) {
            showStatus('Error: ' + data.error, 'error');
            // Re-enable Next Puzzle button
            const $button = $('#newPuzzle');
            $button.prop('disabled', false);
            $button.find('.button-text').removeClass('hidden');
            $button.find('.loading-text').addClass('hidden').removeClass('loading');
            return;
        }
        
        currentPuzzle = data;
        startTimer();
        
        // Set board orientation based on player's turn
        board.orientation(data.turn === 'w' ? 'white' : 'black');
        
        // Update player info
        $('.white-player .player-name').html(`⚪ ${data.white}`);
        $('.white-player .player-elo').html(`Rating: ${data.white_elo}`);
        $('.black-player .player-name').html(`⚫ ${data.black}`);
        $('.black-player .player-elo').html(`Rating: ${data.black_elo}`);
        
        // Update game details
        const dateStr = new Date(data.date.replace(/\./g, '-')).toLocaleDateString();
        $('#game-date').html(`Played on ${dateStr}`);
        $('#game-result').html(`Result: ${data.result}`);
        $('#game-link').attr('href', data.chesscom_link);
        
        // Show the previous position first
        game.load(data.prev_fen);
        board.position(data.prev_fen, false);
        
        // Reset status and remove any highlights
        showStatus('Loading puzzle...', 'success');
        
        // After a short delay, animate to the puzzle position
        setTimeout(() => {
            game.load(data.fen);
            board.position(data.fen, true); // true enables animation
            showStatus('New puzzle loaded. Make your move!', 'success');
            
            // Re-enable Next Puzzle button
            const $button = $('#newPuzzle');
            $button.prop('disabled', false);
            $button.find('.button-text').removeClass('hidden');
            $button.find('.loading-text').addClass('hidden').removeClass('loading');
        }, 1000);
    }).fail(function(xhr) {
        showStatus('Error loading puzzle: ' + xhr.responseJSON.error, 'error');
        // Re-enable Next Puzzle button
        const $button = $('#newPuzzle');
        $button.prop('disabled', false);
        $button.find('.button-text').removeClass('hidden');
        $button.find('.loading-text').addClass('hidden').removeClass('loading');
    });
}