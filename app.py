from flask import Flask, render_template, request, jsonify, session
from chess_utils import get_chesscom_games, find_all_puzzles

app = Flask(__name__, static_url_path='/static')
app.secret_key = 'your-secret-key-here'  # Required for session management

# Store puzzle iterators per session
puzzle_iterators = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/set_username', methods=['POST'])
def set_username():
    username = request.json.get('username')
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    
    try:
        # Get games and create puzzle iterator
        games = get_chesscom_games(username)
        if not games:
            return jsonify({'error': f'No games found for username: {username}. Please check if the username is correct.'}), 404
        print(f"Got {len(games)} games")
        
        # Store username and create new puzzle iterator
        session['username'] = username
        puzzle_iterators[username] = find_all_puzzles(games)
        
        return jsonify({'status': 'success'})
    except Exception as e:
        error_msg = str(e)
        if "404" in error_msg:
            return jsonify({'error': f'Username "{username}" not found on Chess.com. Please check the spelling.'}), 404
        elif "rate limit" in error_msg.lower():
            return jsonify({'error': 'Chess.com API rate limit reached. Please try again in a few minutes.'}), 429
        else:
            print(f"Error in set_username: {str(e)}")
            return jsonify({'error': 'Failed to fetch games. Please try again later.'}), 500

@app.route('/get_puzzle', methods=['GET'])
def get_puzzle():
    username = session.get('username')
    if not username:
        return jsonify({'error': 'Please set a username first'}), 400

    try:
        # Get or create puzzle iterator
        if username not in puzzle_iterators:
            games = get_chesscom_games(username)
            puzzle_iterators[username] = find_all_puzzles(games)
        
        # Get next puzzle
        puzzle = next(puzzle_iterators[username])
        print(puzzle["best_move"])
        return jsonify(**puzzle)
    except StopIteration:
        # If we run out of puzzles, get new games and try again
        if username:
            games = get_chesscom_games(username)
            puzzle_iterators[username] = find_all_puzzles(games)
            return get_puzzle()
        return jsonify({'error': 'No more puzzles available'}), 404
    except Exception as e:
        print(f"Error getting puzzle: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
