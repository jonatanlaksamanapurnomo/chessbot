const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = 3000;
const cors = require('cors');
const axios = require('axios'); // Make sure to install this: npm install axios

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded
app.use(cors());

// Stockfish Online REST API endpoint
const STOCKFISH_API_URL = "https://stockfish.online/api/s/v2.php";

// Basic route
app.get('/', (req, res) => {
    res.send('Chess Analysis Server is running!');
});

// Get best move using Stockfish Online API
app.post('/bestmove/', async (req, res) => {
    let fenString = req.body.fenString;

    // Complete the FEN string if it's partial
    if (fenString.split(' ').length < 6) {
        // If the FEN only has the piece placement and active color
        if (fenString.split(' ').length === 2) {
            // Add castling rights, en passant, halfmove and fullmove
            fenString += ' KQkq - 0 1';
        }
        // If the FEN only has piece placement
        else if (fenString.split(' ').length === 1) {
            // Add active color, castling rights, en passant, halfmove and fullmove
            fenString += ' w KQkq - 0 1';
        }
    }

    console.log('Sending FEN to API:', fenString);

    try {
        // Call Stockfish Online API
        const response = await axios.get(STOCKFISH_API_URL, {
            params: {
                fen: fenString,
                depth: 15 // Use the same depth as your original code
            }
        });

        // Extract the best move from the response
        if (response.data && response.data.success && response.data.bestmove) {
            // The bestmove field might be in format "bestmove e2e4" or just "e2e4"
            let bestMove = response.data.bestmove;
            if (bestMove.includes(' ')) {
                bestMove = bestMove.split(' ')[1];
            }
            res.send(bestMove);
        } else {
            console.error('API returned unexpected format:', response.data);
            res.status(500).send('Unexpected API response format');
        }
    } catch (error) {
        console.error('Error analyzing position:', error.message);
        res.status(500).send('Error analyzing position: ' + error.message);
    }
});

// Advanced analysis endpoint
app.post('/analyze/', async (req, res) => {
    let fenString = req.body.fenString;
    let depth = req.body.depth || 19;

    // Complete the FEN string if it's partial
    if (fenString.split(' ').length < 6) {
        // If the FEN only has the piece placement and active color
        if (fenString.split(' ').length === 2) {
            // Add castling rights, en passant, halfmove and fullmove
            fenString += ' KQkq - 0 1';
        }
        // If the FEN only has piece placement
        else if (fenString.split(' ').length === 1) {
            // Add active color, castling rights, en passant, halfmove and fullmove
            fenString += ' w KQkq - 0 1';
        }
    }

    console.log('Sending FEN for analysis:', fenString);

    try {
        const response = await axios.get(STOCKFISH_API_URL, {
            params: {
                fen: fenString,
                depth: depth
            }
        });

        if (response.data && response.data.success) {
            // Return the full analysis data
            res.json({
                evaluation: response.data.evaluation,
                bestMove: response.data.bestmove,
                continuation: response.data.continuation,
                mate: response.data.mate
            });
        } else {
            console.error('API returned unsuccessful response:', response.data);
            res.status(500).send('API returned unsuccessful response: ' + (response.data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error performing analysis:', error.message);
        res.status(500).send('Error performing analysis');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Chess analysis server listening at http://localhost:${port}`);
});