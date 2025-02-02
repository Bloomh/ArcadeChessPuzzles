# 8-Bit Chess Puzzles
Chess puzzles derived from chess.com games with an arcade theme!

## Usage
Note that these usage instructions are tuned for Mac, and may need slight modifications for other systems.

1. Clone this repository by running `git clone git@github.com:Bloomh/ArcadeChessPuzzles.git`
2. Also make sure to download stockfish: https://stockfishchess.org/download/.
3. Set the `STOCKFISH_PATH` environment variable to point to your installation, for example: `export STOCKFISH_PATH="/opt/homebrew/bin/stockfish"`.
4. Create a virtual environment with `python -m venv venv` and activate it using `source venv/bin/activate`.
5. Install the required packages: `pip install -r requirements.txt`.
6. Run the app: `python app.py`!