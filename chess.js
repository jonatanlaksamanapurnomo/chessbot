let domBoard = document.getElementsByClassName("board")[0];
let domClock = document.getElementsByClassName("clock-bottom")[0];
let isOpening = true;

function isMyTurn() {
  return domClock.classList.contains("clock-player-turn");
}

function side() {
  return domBoard.classList.contains("flipped") ? "b" : "w";
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
  return FENstr.substr(0, FENstr.length - 1) + " " + side();
}

function getBoard() {
  let pieces = Array.from(document.getElementsByClassName("piece"));
  let board = [...new Array(8)].map((elem) => new Array(8).fill(""));
  for (let i = 0; i < pieces.length; i++) {
    let pieceType = pieces[i].getAttribute("class").split(" ")[1];
    pieceType = pieceType[0] == "w" ? pieceType[1].toUpperCase() : pieceType[1];
    let chessComPos = pieces[i]
      .getAttribute("class")
      .split("square-")[1]
      .split("")
      .map((x) => parseInt(x) - 1);
    // board[row][col]
    //if (boardFlipped) board[7 - chessComPos[1]][7 - chessComPos[0]] = pieceType;
    //else board[chessComPos[1]][chessComPos[0]] = pieceType;
    board[chessComPos[1]][chessComPos[0]] = pieceType;
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

function getBoardMakeGuess() {
  if (isMyTurn()) {
    let fenQuery = boardToFEN(getBoard());
    httpPostAsync("http://localhost:3000/bestmove", fenQuery, (move) => {
      console.log(move);
      textToSpeech(move);
    });
  }
}

function forceHelper() {
  let fenQuery = boardToFEN(getBoard());
  httpPostAsync("http://localhost:3000/bestmove", fenQuery, (move) => {
    console.log(move);
    textToSpeech(move);
  });
}

function textToSpeech(message) {
  let msg = new SpeechSynthesisUtterance();
  msg.text = message;
  window.speechSynthesis.speak(msg);
}

playerTurnChange = function (changes) {
  if (side() === "w" && isOpening) {
    setTimeout(getBoardMakeGuess, 750);
  }
  isOpening = false;
  setTimeout(getBoardMakeGuess, 750);
};
let observer = new MutationObserver(playerTurnChange);
observer.observe(domClock, {
  attributes: true,
});

// if enter pressed
document.addEventListener("keypress", function (event) {
  if (event.keyCode == 13) {
    setTimeout(forceHelper, 750);
  }
});
