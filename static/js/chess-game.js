// Initialize global variables
let board = null;
let game = new Chess();
let currentPuzzle = null;

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
            $('#status').html('Correct! Well done!').css('background', '#e8f5e9');
            return;
        }
    }

    game.undo();
    board.position(game.fen());
    $('#status').html('Incorrect move. Try again!').css('background', '#ffebee');
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
    // Handle username submission
    $('#submit-username').on('click', function() {
        const username = $('#username').val();
        if (!username) {
            $('#status').html('Please enter a username');
            return;
        }

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
                $('#status').html('Error: ' + xhr.responseJSON.error);
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
        
        const bestMove = formatMove(currentPuzzle.best_move);
        $('#status').html(`The best move is: ${bestMove}`).css('background', '#fff3e0');
        
        const from = currentPuzzle.best_move.substring(0, 2);
        const to = currentPuzzle.best_move.substring(2, 4);
        $('.square-55d63').removeClass('highlight-solution');
        $(`[data-square="${from}"]`).addClass('highlight-solution');
        $(`[data-square="${to}"]`).addClass('highlight-solution');
    });
});

// Load a new puzzle
function loadNewPuzzle() {
    $.get('/get_puzzle', function(data) {
        if (data.error) {
            $('#status').html('Error: ' + data.error);
            // Re-enable Next Puzzle button
            const $button = $('#newPuzzle');
            $button.prop('disabled', false);
            $button.find('.button-text').removeClass('hidden');
            $button.find('.loading-text').addClass('hidden').removeClass('loading');
            return;
        }
        
        currentPuzzle = data;
        
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
        $('.square-55d63').removeClass('highlight-solution');
        $('#status').html('Loading puzzle...').css('background', '#1a1a1a');
        
        // After a short delay, animate to the puzzle position
        setTimeout(() => {
            game.load(data.fen);
            board.position(data.fen, true); // true enables animation
            $('#status').html('New puzzle loaded. Make your move!').css('background', '#1a1a1a');
            
            // Re-enable Next Puzzle button
            const $button = $('#newPuzzle');
            $button.prop('disabled', false);
            $button.find('.button-text').removeClass('hidden');
            $button.find('.loading-text').addClass('hidden').removeClass('loading');
        }, 1000);
    }).fail(function(xhr) {
        $('#status').html('Error loading puzzle: ' + xhr.responseJSON.error);
        // Re-enable Next Puzzle button
        const $button = $('#newPuzzle');
        $button.prop('disabled', false);
        $button.find('.button-text').removeClass('hidden');
        $button.find('.loading-text').addClass('hidden').removeClass('loading');
    });
}