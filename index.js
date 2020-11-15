const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const port = 3000
let cors = require('cors')
app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})) // for parsing application/x-www-form-urlencoded
app.use(cors())


let STOCKFISH = require("stockfish");
let stockfish = STOCKFISH();

function makeMove(fen) {
    stockfish.postMessage("position fen " + fen);
    stockfish.postMessage('go depth 19');
}

app.get('/', (req, res) => {
    res.send('Hello World!@')
})

// fenString : "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w"
app.post('/bestmove/', (req, res) => {
    let fenString = req.body.fenString;
    Promise.resolve(makeMove(fenString)).then(() => {
        stockfish.onmessage = (event) => {
            if (event && event.includes("bestmove")) {
                let bestMove = event.split(' ')[1];
                res.send(bestMove)
            }
        };

    });

})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})