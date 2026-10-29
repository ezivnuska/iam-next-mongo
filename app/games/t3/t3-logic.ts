export type Player = 'X' | 'O' | null;
export type Board = Player[];

export const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
];

export const checkWinner = (board: Board): { winner: Player; combination: number[] | null; count: number } => {
    const allWinningCombinations: number[][] = [];
    let winner: Player = null;

    for (const [a, b, c] of WINNING_COMBINATIONS) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            if (!winner) {
                winner = board[a];
            }
            allWinningCombinations.push([a, b, c]);
        }
    }

    if (allWinningCombinations.length > 0) {
        const allWinningCells = [...new Set(allWinningCombinations.flat())];
        return { winner, combination: allWinningCells, count: allWinningCombinations.length };
    }

    return { winner: null, combination: null, count: 0 };
};

export const isBoardFull = (board: Board): boolean => {
    return board.every(cell => cell !== null);
};

export const getBestMove = (board: Board): number => {
    const minimax = (currentBoard: Board, isMaximizing: boolean): number => {
        const { winner } = checkWinner(currentBoard);

        if (winner === 'O') return 10;
        if (winner === 'X') return -10;
        if (isBoardFull(currentBoard)) return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (currentBoard[i] === null) {
                    currentBoard[i] = 'O';
                    const score = minimax(currentBoard, false);
                    currentBoard[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (currentBoard[i] === null) {
                    currentBoard[i] = 'X';
                    const score = minimax(currentBoard, true);
                    currentBoard[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    };

    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = 'O';
            const score = minimax(board, false);
            board[i] = null;
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }

    return bestMove;
};

export const shiftBoardUp = (board: Board): Board => {
    return [
        board[3], board[4], board[5],
        board[6], board[7], board[8],
        null, null, null
    ];
};

export const slideUpWinningCells = (board: Board, winningCombination: number[]): Board => {
    const newBoard = [...board];
    const winningSet = new Set(winningCombination);

    for (let col = 0; col < 3; col++) {
        const columnIndices = [col, col + 3, col + 6];
        const winningCellsInColumn = columnIndices.filter(idx => winningSet.has(idx)).length;

        if (winningCellsInColumn > 0) {
            const nonWinningCells: Player[] = [];
            for (const idx of columnIndices) {
                if (!winningSet.has(idx)) {
                    nonWinningCells.push(newBoard[idx]);
                }
            }

            for (let row = 0; row < 3; row++) {
                const idx = row * 3 + col;
                newBoard[idx] = row < nonWinningCells.length ? nonWinningCells[row] : null;
            }
        }
    }

    return newBoard;
};
