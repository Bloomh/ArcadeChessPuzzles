import io
import chess
import chess.pgn
from stockfish import Stockfish
import requests
import random
import os

stockfish = Stockfish(os.environ.get("STOCKFISH_PATH"))

def get_chesscom_games(username):
    # Get the list of archives
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'}
    archives_url = f"https://api.chess.com/pub/player/{username}/games/archives"
    archives = requests.get(archives_url, headers=headers).json()["archives"]

    all_games = []

    # Iterate through each archive
    for archive_url in archives:
        games = requests.get(archive_url, headers=headers).json()['games']
        all_games.extend(games)

    random.shuffle(all_games)
    
    # Debug: Print first game data
    if all_games:
        print("Sample game data:")
        print("PGN:", all_games[0].get('pgn', 'No PGN'))
        print("Keys in game data:", all_games[0].keys())
    
    return all_games

def find_puzzles(game_data, depth=10, evaluation_difference=300):
    try:
        pgn = io.StringIO(game_data['pgn'])
        game = chess.pgn.read_game(pgn)

        player_info = {
            'white': game.headers['White'],
            'black': game.headers['Black'],
            'white_elo': game.headers['WhiteElo'],
            'black_elo': game.headers['BlackElo'],
            'date': game.headers['Date'],
            'result': game.headers['Result'],
            'chesscom_link': game.headers['Link']
        }
    
        board = game.board()
        stockfish = Stockfish(depth=depth)
        
        for move in game.mainline_moves():
            prev_fen = board.fen()
            board.push(move)
            fen = board.fen()
            stockfish.set_fen_position(fen)
            turn = 'w' if board.turn else 'b'
            
            top_moves = stockfish.get_top_moves(2)
            
            if len(top_moves) < 2:
                continue
            
            best_move = top_moves[0]
            second_best_move = top_moves[1]

            def eval_to_cp(move):
                if move['Mate'] is not None:
                    return 10000 * move['Mate']
                return move['Centipawn']
            
            best_eval = eval_to_cp(best_move)
            second_best_eval = eval_to_cp(second_best_move)
            
            # Check if the evaluation difference is large enough and the evaluations have different signs
            # so that puzzles are picked where only the best move is winning
            if abs(best_eval - second_best_eval) > evaluation_difference and best_eval * second_best_eval < 0:     
                yield {
                    'fen': fen,
                    'prev_fen': prev_fen,
                    'best_move': best_move['Move'],
                    'evaluation': best_eval,
                    'second_best_move': second_best_move['Move'],
                    'second_best_evaluation': second_best_eval,
                    'pgn': game_data['pgn'],
                    'turn': turn,
                    **player_info
                }
    except Exception as e:
        print(f"Error finding puzzles: {str(e)}")
        return

def find_all_puzzles(games, depth=10, evaluation_difference=300):    
    for i,game in enumerate(games):
        print(f"Checking game {i}")
        puzzles = find_puzzles(game, depth=depth, evaluation_difference=evaluation_difference)
        yield from puzzles