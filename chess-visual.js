// Variables to track state
let domBoard = document.getElementsByClassName("board")[0];
let domClock = document.getElementsByClassName("clock-bottom")[0];
let isOpening = true;
let lastSuggestedMove = null;
let learningMode = false;
let moveExplanation = "";

// Improved function to find the chess board element
function getActualBoard() {
    // First try the web component selector, which matches the board structure in the HTML
    const wcBoard = document.querySelector('wc-chess-board');
    if (wcBoard) return wcBoard;

    // Fall back to other common selectors
    return document.querySelector('.board-layout-chessboard') ||
        document.querySelector('.board') ||
        domBoard;
}

// Better function to detect if the board is flipped
function isBoardFlipped() {
    // First try to get the actual board
    const board = getActualBoard();
    if (!board) return false;

    // Check if board has the flipped class
    if (board.classList.contains("flipped")) {
        return true;
    }

    // Also check player side as a backup indicator
    const playerSide = getPlayerSide();
    const isBlack = playerSide === "b";

    return isBlack;
}

// Improved function to determine which side the player is on
function getPlayerSide() {
    const board = getActualBoard();
    if (!board) return "w";

    // First check if the board is flipped - this is a strong indicator for black
    if (board.classList.contains("flipped")) {
        return "b";
    }

    // Check for white and black pieces
    const whitePieces = board.querySelectorAll(".piece[class*='wp'], .piece[class*='wr'], .piece[class*='wn'], .piece[class*='wb'], .piece[class*='wq'], .piece[class*='wk']");
    const blackPieces = board.querySelectorAll(".piece[class*='bp'], .piece[class*='br'], .piece[class*='bn'], .piece[class*='bb'], .piece[class*='bq'], .piece[class*='bk']");

    // If there are no pieces yet, return default white
    if (whitePieces.length === 0 && blackPieces.length === 0) {
        return "w";
    }

    // Look for pieces on the bottom two rows (ranks 1-2)
    let whitePiecesOnBottom = 0;
    let blackPiecesOnBottom = 0;

    // Count pieces in bottom rows
    for (const piece of whitePieces) {
        if (piece.className.includes("square-") && /square-[1-8][1-2]/.test(piece.className)) {
            whitePiecesOnBottom++;
        }
    }

    for (const piece of blackPieces) {
        if (piece.className.includes("square-") && /square-[1-8][1-2]/.test(piece.className)) {
            blackPiecesOnBottom++;
        }
    }

    // If there are more black pieces on the bottom, player is black
    return blackPiecesOnBottom > whitePiecesOnBottom ? "b" : "w";
}

// Replace old side() function with the improved one
function side() {
    return getPlayerSide();
}

function isMyTurn() {
    // Check if domClock exists and has the required class
    if (!domClock) {
        domClock = document.querySelector(".clock-bottom");
        if (!domClock) return false;
    }
    return domClock.classList.contains("clock-player-turn");
}

function injected() {
    return "injected woi";
}

function boardToFEN(board) {
    let FENstr = "";
    let emptyCounter = 0;

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            let curPiece = board[7 - i][j];
            if (curPiece != "") {
                if (emptyCounter > 0) {
                    FENstr += emptyCounter.toString();
                    emptyCounter = 0;
                }
                FENstr += curPiece;
            } else {
                emptyCounter += 1;
            }
        }
        if (emptyCounter > 0) {
            FENstr += emptyCounter.toString();
            emptyCounter = 0;
        }
        FENstr += "/";
    }

    // Get the correct player side
    const playerSide = getPlayerSide();

    return FENstr.substr(0, FENstr.length - 1) + " " + playerSide;
}

function getBoard() {
    const actualBoard = getActualBoard();
    if (!actualBoard) return []; // Return empty array if board not found

    let pieces = Array.from(actualBoard.querySelectorAll(".piece"));
    let board = [...new Array(8)].map((elem) => new Array(8).fill(""));

    for (let i = 0; i < pieces.length; i++) {
        let pieceClass = pieces[i].getAttribute("class");
        if (!pieceClass) continue;

        // Extract piece type from class
        let pieceTypeMatch = pieceClass.match(/(w|b)([kqrbnp])/i);
        if (!pieceTypeMatch) continue;

        let pieceColor = pieceTypeMatch[1];
        let pieceType = pieceTypeMatch[2];

        // Convert to FEN notation (uppercase for white, lowercase for black)
        let pieceNotation = pieceColor === 'w' ? pieceType.toUpperCase() : pieceType.toLowerCase();

        // Extract square coordinates
        let squareMatch = pieceClass.match(/square-(\d)(\d)/);
        if (!squareMatch) continue;

        let file = parseInt(squareMatch[1]) - 1;
        let rank = parseInt(squareMatch[2]) - 1;

        board[rank][file] = pieceNotation;
    }

    return board;
}

function httpPostAsync(theUrl, fen, callback) {
    let xmlHttp = new XMLHttpRequest();

    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    };

    xmlHttp.open("POST", theUrl, true); // true for asynchronous
    xmlHttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    let bodyParams = {
        fenString: fen,
    };
    xmlHttp.send(JSON.stringify(bodyParams));
}

// Function to get move explanation
function getExplanation(fen, move) {
    return new Promise((resolve, reject) => {
        let xmlHttp = new XMLHttpRequest();

        xmlHttp.onreadystatechange = function () {
            if (xmlHttp.readyState == 4) {
                if (xmlHttp.status == 200) {
                    try {
                        const response = JSON.parse(xmlHttp.responseText);
                        resolve(response.explanation || "No explanation available");
                    } catch (e) {
                        resolve("Explanation not available");
                    }
                } else {
                    resolve("Failed to get explanation");
                }
            }
        };

        xmlHttp.open("POST", "http://localhost:3000/explain", true);
        xmlHttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xmlHttp.send(JSON.stringify({
            fenString: fen,
            move: move
        }));
    });
}

// Improved function to convert algebraic notation to coordinates
function algebraicToCoordinates(algebraic) {
    if (!algebraic || algebraic.length < 4) return null;

    // Clean the move string - remove any spaces or special characters
    const cleanMove = algebraic.replace(/\s+/g, '').trim();

    // Parse the algebraic notation
    const files = "abcdefgh";
    const fromFile = files.indexOf(cleanMove[0].toLowerCase());
    const fromRank = parseInt(cleanMove[1]) - 1; // 0-7 rank
    const toFile = files.indexOf(cleanMove[2].toLowerCase());
    const toRank = parseInt(cleanMove[3]) - 1; // 0-7 rank

    if (fromFile < 0 || toFile < 0 || fromRank < 0 || fromRank > 7 || toRank < 0 || toRank > 7) {
        return null;
    }

    return {
        from: { file: fromFile, rank: fromRank },
        to: { file: toFile, rank: toRank }
    };
}

// Improved function to highlight squares
function highlightMoveSquares(fromFile, fromRank, toFile, toRank) {
    clearDrawings();

    const board = getActualBoard();
    if (!board) {
        return;
    }

    // When we're playing as black (or the board is flipped), we need to flip the move
    let fromSquare, toSquare;

    // Convert to chess.com square notation (1-8 instead of 0-7)
    fromSquare = `${fromFile + 1}${fromRank + 1}`;
    toSquare = `${toFile + 1}${toRank + 1}`;

    // Create highlight for "from" square
    const fromHighlight = document.createElement("div");
    fromHighlight.className = "highlight square-" + fromSquare;
    fromHighlight.style.backgroundColor = "rgb(255, 255, 51)"; // Yellow
    fromHighlight.style.opacity = "0.5";
    fromHighlight.setAttribute("data-test-element", "highlight");

    // Create highlight for "to" square
    const toHighlight = document.createElement("div");
    toHighlight.className = "highlight square-" + toSquare;
    toHighlight.style.backgroundColor = "rgb(0, 255, 0)"; // Green
    toHighlight.style.opacity = "0.5";
    toHighlight.setAttribute("data-test-element", "highlight");

    // Add highlights to the board
    board.appendChild(fromHighlight);
    board.appendChild(toHighlight);
}

// Create explanation element
function createExplanationElement() {
    // Create container for explanation if it doesn't exist
    if (!document.getElementById("chess-assistant-explanation")) {
        // Find the chess board element
        const actualBoard = getActualBoard();
        if (!actualBoard) {
            return;
        }

        // Create explanation container
        const explanationBox = document.createElement("div");
        explanationBox.id = "chess-assistant-explanation";
        explanationBox.style.position = "absolute";
        explanationBox.style.bottom = "10px";
        explanationBox.style.left = "10px";
        explanationBox.style.width = "calc(100% - 20px)";
        explanationBox.style.backgroundColor = "rgba(0,0,0,0.7)";
        explanationBox.style.color = "white";
        explanationBox.style.padding = "10px";
        explanationBox.style.borderRadius = "5px";
        explanationBox.style.display = "none";
        explanationBox.style.maxHeight = "150px";
        explanationBox.style.overflow = "auto";
        explanationBox.style.fontFamily = "Arial, sans-serif";
        explanationBox.style.zIndex = "9999";

        // Add the explanation box to the board container
        if (actualBoard && actualBoard.parentNode) {
            const boardWrapper = actualBoard.parentNode;
            boardWrapper.style.position = "relative"; // Ensure parent has relative positioning
            boardWrapper.appendChild(explanationBox);
        }
    }
}

// Improved function to clear all drawings (highlights)
function clearDrawings() {
    const board = getActualBoard();
    if (board) {
        const highlights = board.querySelectorAll(".highlight");
        highlights.forEach(highlight => highlight.remove());
    }
}

// Display move explanation
function showExplanation(text) {
    const explanationBox = document.getElementById("chess-assistant-explanation");
    if (explanationBox) {
        explanationBox.textContent = text;
        explanationBox.style.display = "block";
    }
}

// Hide move explanation
function hideExplanation() {
    const explanationBox = document.getElementById("chess-assistant-explanation");
    if (explanationBox) {
        explanationBox.style.display = "none";
    }
}

// Process the best move response
async function processBestMove(move, fen) {
    lastSuggestedMove = move;

    // Make sure the move is in proper format for visualization
    if (move && move.length >= 4) {
        // Clean up the move string - it might have extra characters
        const cleanMove = move.replace(/\s+/g, '').trim();

        // Format looks good for UCI coordinates
        const coords = algebraicToCoordinates(cleanMove);
        if (coords) {
            try {
                // Use the improved highlighting function
                highlightMoveSquares(
                    coords.from.file,
                    coords.from.rank,
                    coords.to.file,
                    coords.to.rank
                );
            } catch (e) {
                // Error handling without console.log
            }
        }
    }

    // In learning mode, get and show explanation
    if (learningMode) {
        try {
            moveExplanation = await getExplanation(fen, move);
            showExplanation(moveExplanation);
        } catch (error) {
            moveExplanation = "This move helps improve your position.";
            showExplanation(moveExplanation);
        }

        // Format move for speech (e.g., "e2e4" to "e2 to e4")
        if (move.length >= 4) {
            const from = move.substring(0, 2);
            const to = move.substring(2, 4);
            const speechMove = `${from} to ${to}`;
            textToSpeech(speechMove + ". " + moveExplanation);
        } else {
            textToSpeech(move + ". " + moveExplanation);
        }
    } else {
        // Just read the move aloud
        if (move.length >= 4) {
            const from = move.substring(0, 2);
            const to = move.substring(2, 4);
            textToSpeech(`${from} to ${to}`);
        } else {
            textToSpeech(move);
        }
    }
}

function getBoardMakeGuess() {
    if (isMyTurn()) {
        let fenQuery = boardToFEN(getBoard());
        httpPostAsync("http://localhost:3000/bestmove", fenQuery, (move) => {
            processBestMove(move, fenQuery);
        });
    }
}

function forceHelper() {
    let fenQuery = boardToFEN(getBoard());
    httpPostAsync("http://localhost:3000/bestmove", fenQuery, (move) => {
        processBestMove(move, fenQuery);
    });
}

// Get a detailed analysis for learning purposes
function requestAnalysis() {
    let fenQuery = boardToFEN(getBoard());
    httpPostAsync("http://localhost:3000/analyze", fenQuery, (analysisData) => {
        try {
            const analysis = JSON.parse(analysisData);
            let explanationText = "Position Analysis:\n";

            if (analysis.evaluation) {
                const evalValue = parseFloat(analysis.evaluation);
                const favoringSide = evalValue > 0 ? "White" : "Black";
                explanationText += `Evaluation: ${analysis.evaluation} (favoring ${favoringSide})\n`;
            }

            if (analysis.bestMove) {
                explanationText += `Best move: ${analysis.bestMove}\n`;
            }

            if (analysis.continuation) {
                explanationText += `Best continuation: ${analysis.continuation}\n`;
            }

            if (analysis.mate) {
                explanationText += `Checkmate in: ${analysis.mate} moves\n`;
            }

            showExplanation(explanationText);
            textToSpeech("Analysis complete");
        } catch (error) {
            showExplanation("Failed to analyze position");
        }
    });
}

// Toggle learning mode
function toggleLearningMode() {
    learningMode = !learningMode;
    const status = learningMode ? "enabled" : "disabled";
    textToSpeech(`Learning mode ${status}`);

    // Show or hide explanation based on learning mode
    if (!learningMode) {
        hideExplanation();
    } else if (lastSuggestedMove) {
        showExplanation(moveExplanation);
    }
}

function textToSpeech(message) {
    // let msg = new SpeechSynthesisUtterance();
    // msg.text = message;
    // window.speechSynthesis.speak(msg);
}

// Initialize or update the chess assistant
function initializeChessAssistant() {
    try {
        // Update references to DOM elements
        domBoard = document.getElementsByClassName("board")[0] || document.querySelector('wc-chess-board');
        domClock = document.getElementsByClassName("clock-bottom")[0] || document.querySelector('.clock-bottom');

        // Create explanation element
        createExplanationElement();

        // If there's an active move suggestion, redraw it
        if (lastSuggestedMove && lastSuggestedMove.length >= 4) {
            const coords = algebraicToCoordinates(lastSuggestedMove);
            if (coords) {
                highlightMoveSquares(coords.from.file, coords.from.rank, coords.to.file, coords.to.rank);
            }
        }
    } catch (e) {
        // Error handling without console.log
    }
}

// Setup board change listeners
function setupBoardChangeListeners() {
    // Listen for board flip events
    const flipButton = document.getElementById('board-controls-flip');
    if (flipButton) {
        flipButton.addEventListener('click', () => {
            setTimeout(initializeChessAssistant, 500);
        });
    }

    // Listen for window resize events
    window.addEventListener('resize', () => {
        setTimeout(initializeChessAssistant, 500);
    });
}

// Initialize the chess assistant when the script loads
setTimeout(() => {
    try {
        initializeChessAssistant();
        setupBoardChangeListeners();
    } catch (e) {
        // Error handling without console.log
    }
}, 2000); // Wait for board to fully load

// Setup player turn change observer
let playerTurnChange = function (changes) {
    if (side() === "w" && isOpening) {
        setTimeout(getBoardMakeGuess, 750);
    }
    isOpening = false;
    setTimeout(getBoardMakeGuess, 750);
};

// Setup DOM observer to detect player turn changes
function setupTurnObserver() {
    // Find the clock element if it doesn't exist
    if (!domClock) {
        domClock = document.querySelector(".clock-bottom");
        if (!domClock) {
            return;
        }
    }

    let observer = new MutationObserver(playerTurnChange);
    observer.observe(domClock, {
        attributes: true,
    });
}

// Setup the turn observer after initialization
setTimeout(setupTurnObserver, 2500);

// Handle keyboard shortcuts
document.addEventListener("keypress", function (event) {
    // Enter key - force help
    if (event.keyCode == 13) {
        setTimeout(forceHelper, 750);
    }

    // 'L' key - toggle learning mode
    if (event.keyCode == 108) {
        toggleLearningMode();
    }

    // 'A' key - request detailed analysis
    if (event.keyCode == 97) {
        requestAnalysis();
    }

    // 'C' key - clear all drawings
    if (event.keyCode == 99) {
        clearDrawings();
        hideExplanation();
    }
});