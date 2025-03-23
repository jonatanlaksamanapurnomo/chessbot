const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = 3000;
const cors = require('cors');
const axios = require('axios'); // Make sure to install this: npm install axios

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded
app.use(cors());

// Lichess API endpoints
const LICHESS_OPENING_URL = "https://explorer.lichess.ovh/master";
const LICHESS_CLOUD_EVAL_URL = "https://lichess.org/api/cloud-eval";

// Basic route
app.get('/', (req, res) => {
    res.send('Chess Analysis Server is running!');
});

// Get best move using Lichess cloud evaluation
app.post('/bestmove/', async (req, res) => {
    let fenString = req.body.fenString;

    try {
        // Call Lichess cloud evaluation API
        const response = await axios.get(LICHESS_CLOUD_EVAL_URL, {
            params: {
                fen: fenString,
                multiPv: 1
            },
            headers: {
                'Accept': 'application/json'
            }
        });

        // Extract the best move from the response
        if (response.data && response.data.pvs && response.data.pvs.length > 0) {
            // The first move in the principal variation is the best move
            let bestMove = response.data.pvs[0].moves.split(' ')[0];
            res.send(bestMove);
        } else {
            res.status(404).send('No best move found in the analysis');
        }
    } catch (error) {
        console.error('Error analyzing position:', error.message);

        // If cloud eval fails, fallback to opening database
        try {
            const openingResponse = await axios.get(LICHESS_OPENING_URL, {
                params: {
                    fen: fenString,
                    moves: 10
                }
            });

            if (openingResponse.data && openingResponse.data.moves && openingResponse.data.moves.length > 0) {
                // Sort moves by win rate and popularity
                const bestMoves = openingResponse.data.moves.sort((a, b) => {
                    // Calculate win rate (white wins + 0.5 * draws)
                    const aWinRate = (a.white + 0.5 * a.draws) / (a.white + a.black + a.draws);
                    const bWinRate = (b.white + 0.5 * b.draws) / (b.white + b.black + b.draws);

                    // Sort by win rate first, then by games played
                    return bWinRate - aWinRate || (b.white + b.black + b.draws) - (a.white + a.black + a.draws);
                });

                res.send(bestMoves[0].uci);
            } else {
                res.status(404).send('No moves found in opening database');
            }
        } catch (openingError) {
            console.error('Error querying opening database:', openingError.message);
            res.status(500).send('Error analyzing position');
        }
    }
});

// Get opening information from Lichess database
app.post('/opening/', async (req, res) => {
    let fenString = req.body.fenString;

    try {
        const response = await axios.get(LICHESS_OPENING_URL, {
            params: {
                fen: fenString,
                moves: 5
            }
        });

        if (response.data) {
            res.json({
                opening: response.data.opening,
                moves: response.data.moves,
                topGames: response.data.topGames
            });
        } else {
            res.status(404).send('Opening not found');
        }
    } catch (error) {
        console.error('Error fetching opening data:', error.message);
        res.status(500).send('Error fetching opening data');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Chess analysis server listening at http://localhost:${port}`);
});