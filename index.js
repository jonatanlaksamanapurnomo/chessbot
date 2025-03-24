const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = 3000;
const cors = require('cors');
const axios = require('axios');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
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

// New endpoint for move explanation
app.post('/explain/', async (req, res) => {
    const fenString = req.body.fenString;
    const move = req.body.move;

    if (!fenString || !move) {
        return res.status(400).send('Missing FEN string or move');
    }

    // Complete the FEN string if needed
    let completeFen = fenString;
    if (completeFen.split(' ').length < 6) {
        if (completeFen.split(' ').length === 2) {
            completeFen += ' KQkq - 0 1';
        } else if (completeFen.split(' ').length === 1) {
            completeFen += ' w KQkq - 0 1';
        }
    }

    try {
        // First get an analysis of the current position
        const currentPosResponse = await axios.get(STOCKFISH_API_URL, {
            params: {
                fen: completeFen,
                depth: 15
            }
        });

        // Get the potential threats and opportunities in the position
        const positionFeatures = analyzePositionFeatures(completeFen);

        // Generate meaningful explanation based on the move and position
        let explanation = "";

        // Check if it's the best move according to engine
        if (currentPosResponse.data &&
            currentPosResponse.data.success &&
            currentPosResponse.data.bestmove &&
            currentPosResponse.data.bestmove.includes(move)) {
            explanation += "This is the strongest move in this position. ";
        }

        // Add explanation based on the move type
        const moveType = determineMoveType(move, completeFen);
        explanation += getMoveTypeExplanation(moveType, move);

        // Add position-specific context
        if (positionFeatures.length > 0) {
            explanation += " In this position: " + positionFeatures.join(". ") + ".";
        }

        res.json({
            move: move,
            explanation: explanation
        });
    } catch (error) {
        console.error('Error generating explanation:', error);
        res.status(500).send('Error generating explanation: ' + error.message);
    }
});

// Helper function to determine move type (simplified version)
function determineMoveType(move, fen) {
    // This is a simplified implementation
    // In a real implementation, you would parse the FEN and check the move against the board state

    if (move.length < 4) return "unknown";

    // Some basic patterns
    const src = move.substring(0, 2);
    const dst = move.substring(2, 4);

    // Check for pawn promotion
    if (move.length > 4 && "qrbnQRBN".includes(move[4])) {
        return "promotion";
    }

    // Check for castling (king moving two squares)
    if ((src === "e1" && (dst === "g1" || dst === "c1")) ||
        (src === "e8" && (dst === "g8" || dst === "c8"))) {
        return "castling";
    }

    // For a real implementation, you would need to parse the FEN
    // and check if the move captures a piece, develops a piece, etc.

    return "normal";
}

// Helper function to generate explanation based on move type
function getMoveTypeExplanation(moveType, move) {
    switch (moveType) {
        case "castling":
            return move.charAt(2) === 'g' ?
                "This is kingside castling, which helps protect your king and connects your rooks." :
                "This is queenside castling, which helps protect your king and develops your queenside rook.";
        case "promotion":
            return `This move promotes your pawn to a ${getPieceName(move[4])}, significantly increasing your material advantage.`;
        case "normal":
            // For a real implementation, you would need more context
            return "This move improves your position by controlling important squares and developing your pieces.";
        default:
            return "This is a good move in the current position.";
    }
}

// Helper function to get piece name
function getPieceName(pieceChar) {
    const pieceNames = {
        'q': 'queen', 'Q': 'queen',
        'r': 'rook', 'R': 'rook',
        'b': 'bishop', 'B': 'bishop',
        'n': 'knight', 'N': 'knight'
    };
    return pieceNames[pieceChar] || 'piece';
}

// Helper function to analyze position features (simplified)
function analyzePositionFeatures(fen) {
    // This is a simplified implementation
    // In a real implementation, you would parse the FEN and analyze the position

    const features = [];

    // Example features based on simple pattern matching
    if (fen.includes('1k') || fen.includes('2k') || fen.includes('k1') || fen.includes('k2')) {
        features.push("Your king safety is important");
    }

    if (fen.includes('p') || fen.includes('P')) {
        features.push("Pawn structure plays a key role");
    }

    // Add more sophisticated analysis in a real implementation

    return features;
}

// Start the server
app.listen(port, () => {
    console.log(`Chess analysis server listening at http://localhost:${port}`);
});