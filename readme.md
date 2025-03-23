# Chess Assistant Server

A Node.js Express server that provides chess analysis capabilities by connecting to the Stockfish REST API.

## Overview

This server acts as a bridge between your chess application and the Stockfish Online API. It processes chess positions in FEN notation and returns the best moves and analysis.

## Features

- **Best Move Analysis**: Get the best move for any chess position
- **Detailed Analysis**: Get evaluation, continuation, and potential mate sequences
- **FEN String Handling**: Automatically completes partial FEN strings
- **Easy Integration**: Simple REST API endpoints for your chess applications

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/chess-assistant-server.git
   cd chess-assistant-server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

The server will run on port 3000 by default.

## Dependencies

- Express: Web server framework
- Axios: HTTP client for API requests
- Body-parser: Parse incoming request bodies
- CORS: Enable cross-origin resource sharing

## API Endpoints

### GET /

Basic endpoint to check if the server is running.

Response: `Chess Analysis Server is running!`

### POST /bestmove/

Get the best move for a given chess position.

**Request Body:**
```json
{
  "fenString": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
}
```

**Response:**
```
e2e4
```

The `fenString` can be a partial FEN string (just the board position and active color). The server will automatically complete it before sending it to the Stockfish API.

### POST /analyze/

Get detailed analysis for a chess position.

**Request Body:**
```json
{
  "fenString": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "depth": 20
}
```

**Response:**
```json
{
  "evaluation": 0.32,
  "bestMove": "e2e4",
  "continuation": "e2e4 e7e5 g1f3 b8c6 f1b5",
  "mate": null
}
```

The `depth` parameter is optional and defaults to 19.

## Client Integration

Here's an example of how to call the API from JavaScript:

```javascript
// Get best move
fetch('http://localhost:3000/bestmove/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fenString: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  }),
})
.then(response => response.text())
.then(bestMove => console.log('Best move:', bestMove));
```

## Chrome Extension Integration

This server is designed to work with the chess.js Chrome extension, which can be injected into chess websites to provide move suggestions.

## Error Handling

The server provides detailed error messages if anything goes wrong with the API request or if the FEN string is invalid.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Stockfish Online API](https://stockfish.online/) for providing the chess analysis service
- [Express](https://expressjs.com/) for the web server framework