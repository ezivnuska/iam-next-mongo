// app/games/t3/tic-tac-toe.tsx

'use client';

import { useState, useEffect } from 'react';
import PageContent from '@/app/ui/layout/page/page-content';
import PageHeader from '@/app/ui/layout/page-header';
import { Button } from '@/app/ui/button';

type Player = 'X' | 'O' | null;
type Board = Player[];
type GameMode = 'pvp' | 'ai';
type ShiftDirection = 'up' | 'down' | 'left' | 'right' | null;

const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
];

const checkWinner = (board: Board): { winner: Player; combination: number[] | null; count: number } => {
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
        // Flatten all winning combinations into a single array of unique cell indices
        const allWinningCells = [...new Set(allWinningCombinations.flat())];
        return { winner, combination: allWinningCells, count: allWinningCombinations.length };
    }

    return { winner: null, combination: null, count: 0 };
};

const isBoardFull = (board: Board): boolean => {
    return board.every(cell => cell !== null);
};

const getBestMove = (board: Board): number => {
    // Simple AI using minimax algorithm
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

const shiftBoardUp = (board: Board): Board => {
    return [
        board[3], board[4], board[5], // Middle row moves to top
        board[6], board[7], board[8], // Bottom row moves to middle
        null, null, null               // New empty bottom row
    ];
};

const slideUpWinningCells = (board: Board, winningCombination: number[]): Board => {
    const newBoard = [...board];
    const winningSet = new Set(winningCombination);

    // Process each column independently
    for (let col = 0; col < 3; col++) {
        const columnIndices = [col, col + 3, col + 6];

        // Count winning cells in this column
        const winningCellsInColumn = columnIndices.filter(idx => winningSet.has(idx)).length;

        if (winningCellsInColumn > 0) {
            // Collect non-winning cells from this column
            const nonWinningCells: Player[] = [];
            for (const idx of columnIndices) {
                if (!winningSet.has(idx)) {
                    nonWinningCells.push(newBoard[idx]);
                }
            }

            // Fill column: non-winning cells at top, then nulls at bottom
            for (let row = 0; row < 3; row++) {
                const idx = row * 3 + col;
                if (row < nonWinningCells.length) {
                    newBoard[idx] = nonWinningCells[row];
                } else {
                    newBoard[idx] = null;
                }
            }
        }
    }

    return newBoard;
};

export default function TicTacToe() {
    const [board, setBoard] = useState<Board>(Array(9).fill(null));
    const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
    const [gameMode, setGameMode] = useState<GameMode | null>(null);
    const [scores, setScores] = useState({ X: 0, O: 0 });
    const [isAnimating, setIsAnimating] = useState(false);
    const [disableTransition, setDisableTransition] = useState(false);
    const [shiftDirection, setShiftDirection] = useState<ShiftDirection>(null);
    const [winningCells, setWinningCells] = useState<number[]>([]);
    const [fadingCells, setFadingCells] = useState<number[]>([]);
    const [slidingCells, setSlidingCells] = useState<Set<number>>(new Set());
    const [isSliding, setIsSliding] = useState(false);
    const [showPhantomCells, setShowPhantomCells] = useState(false);
    const [shouldCheckForWins, setShouldCheckForWins] = useState(false);

    // Check for winning combinations after board updates (cascade effect)
    useEffect(() => {
        if (shouldCheckForWins && fadingCells.length === 0 && !isSliding) {
            setShouldCheckForWins(false);

            const { winner: gameWinner, combination, count } = checkWinner(board);
            if (gameWinner && combination) {
                // Found another winning combination - animate it
                setIsAnimating(false);
                setShiftDirection(null);
                setWinningCells(combination);
                setFadingCells(combination);
                setScores(prev => ({ ...prev, [gameWinner]: prev[gameWinner] + count }));

                // After fade completes, start slide animation
                setTimeout(() => {
                    setFadingCells([]);
                    setIsSliding(true);

                    // After slide animation, update board
                    setTimeout(() => {
                        setDisableTransition(true);
                        const shiftedBoard = slideUpWinningCells(board, combination);
                        setBoard(shiftedBoard);
                        setWinningCells([]);
                        setIsSliding(false);

                        // Re-enable transitions and check again
                        setTimeout(() => {
                            setDisableTransition(false);
                            setShouldCheckForWins(true); // Check again for cascade wins
                        }, 50);
                    }, 600);
                }, 600);
            } else if (isBoardFull(board)) {
                // Board full with no winners - shift up
                setShiftDirection('up');
                setIsAnimating(true);

                setTimeout(() => {
                    setDisableTransition(true);
                    setIsAnimating(false);

                    const shiftedBoard = shiftBoardUp(board);
                    setBoard(shiftedBoard);

                    setTimeout(() => {
                        setDisableTransition(false);
                        setShiftDirection(null);
                        // Continue game with next player (no winning combinations possible after board shift)
                        setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
                    }, 50);
                }, 600);
            } else {
                // No more winning combinations - switch to next player
                setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
            }
        }
    }, [board, shouldCheckForWins, fadingCells, isSliding, currentPlayer]);

    useEffect(() => {
        if (gameMode === 'ai' && currentPlayer === 'O' && !isAnimating && fadingCells.length === 0) {
            // AI makes a move after a delay (1 second)
            const timer = setTimeout(() => {
                setBoard(prevBoard => {
                    const aiMove = getBestMove([...prevBoard]);
                    if (aiMove !== -1 && !prevBoard[aiMove]) {
                        const newBoard = [...prevBoard];
                        newBoard[aiMove] = 'O';

                        // Don't check for winner here - just update board and let cascade check handle it
                        setShouldCheckForWins(true);

                        return newBoard;
                    }
                    return prevBoard;
                });
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [currentPlayer, gameMode, isAnimating, fadingCells]);

    const handleCellClick = (index: number) => {
        if (board[index] || !gameMode || isAnimating || fadingCells.length > 0) return;
        if (gameMode === 'ai' && currentPlayer === 'O') return; // Prevent clicking during AI turn

        const newBoard = [...board];
        newBoard[index] = currentPlayer;
        setBoard(newBoard);

        // Let cascade check handle winner detection
        setShouldCheckForWins(true);
    };

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setCurrentPlayer('X');
        setIsAnimating(false);
        setDisableTransition(false);
        setShiftDirection(null);
        setWinningCells([]);
        setFadingCells([]);
        setSlidingCells(new Set());
        setIsSliding(false);
        setShouldCheckForWins(false);
    };

    const resetAll = () => {
        resetGame();
        setGameMode(null);
        setScores({ X: 0, O: 0 });
    };

    if (!gameMode) {
        return (
            <PageContent>
                <PageHeader
                    useBreadcrumbs={true}
                    breadcrumbs={[
                        { label: 'Games', href: '/games' },
                        { label: 'Tic-Tac-Toe', href: '/games/t3', active: true }
                    ]}
                    // subtitle='Classic Tic-Tac-Toe game'
                />

                <div className='flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4'>
                    <h1 className='text-4xl font-bold text-gray-900 dark:text-white'>
                        Choose Game Mode
                    </h1>
                    <div className='flex flex-col gap-4 w-full max-w-md'>
                        <Button
                            onClick={() => setGameMode('pvp')}
                            className='py-8 text-xl'
                        >
                            Player vs Player
                        </Button>
                        <Button
                            onClick={() => setGameMode('ai')}
                            className='py-8 text-xl'
                            variant='secondary'
                        >
                            Player vs AI
                        </Button>
                    </div>
                </div>
            </PageContent>
        );
    }

    return (
        <PageContent>
            <PageHeader
                useBreadcrumbs={true}
                breadcrumbs={[
                    { label: 'Games', href: '/games' },
                    { label: 'Tic-Tac-Toe', href: '/games/t3', active: true }
                ]}
                subtitle={gameMode === 'ai' ? 'Player vs AI' : 'Player vs Player'}
            />

            <div className='flex flex-col items-center gap-8 px-4 pb-8'>
                {/* Score Board */}
                <div className='flex gap-4 text-center'>
                    <div className='bg-blue-100 dark:bg-blue-900 px-6 py-3 rounded-lg'>
                        <div className='text-2xl font-bold text-blue-600 dark:text-blue-300'>
                            {scores.X}
                        </div>
                        <div className='text-sm text-gray-600 dark:text-gray-400'>
                            Player X
                        </div>
                    </div>
                    <div className='bg-red-100 dark:bg-red-900 px-6 py-3 rounded-lg'>
                        <div className='text-2xl font-bold text-red-600 dark:text-red-300'>
                            {scores.O}
                        </div>
                        <div className='text-sm text-gray-600 dark:text-gray-400'>
                            {gameMode === 'ai' ? 'AI (O)' : 'Player O'}
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div className='text-center'>
                    <h2 className='text-2xl font-semibold text-gray-700 dark:text-gray-300'>
                        Current Turn: <span className={currentPlayer === 'X' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}>
                            {currentPlayer}
                        </span>
                    </h2>
                </div>

                {/* Game Board - 3 Independent Columns */}
                <div className='w-full max-w-md aspect-square flex gap-2'>
                    {[0, 1, 2].map((colIndex) => {
                        // Get indices for this column: col 0 = [0,3,6], col 1 = [1,4,7], col 2 = [2,5,8]
                        const columnIndices = [colIndex, colIndex + 3, colIndex + 6];

                        // Check if any cells in this column are in the winning combination
                        const columnHasWinner = columnIndices.some(idx => winningCells.includes(idx));

                        // Count how many winning cells are in this column (from winningCells or fadingCells)
                        const winningCellsInColumn = columnIndices.filter(idx =>
                            winningCells.includes(idx) || fadingCells.includes(idx)
                        ).length;

                        // Calculate total height needed for phantom cells
                        const phantomCellCount = (fadingCells.length > 0 || isSliding) ? winningCellsInColumn : 0;
                        const totalCells = 3 + phantomCellCount;

                        // Calculate what percentage of the expanded column to shift up
                        // If we have 4 total cells and need to shift 1 up, that's 25% of the column
                        const shiftPercentage = totalCells > 3 ? (winningCellsInColumn / totalCells) * 100 : 0;

                        // Determine if this is a win scenario (any winning cells exist globally)
                        const isWinScenario = winningCells.length > 0 || fadingCells.length > 0 || isSliding;

                        // Determine if this is a draw scenario (full board shift, no winners)
                        const isDrawScenario = !isWinScenario && isAnimating && shiftDirection === 'up';

                        // Find the topmost winning cell row in this column (for win scenario)
                        let topmostWinningRow = 3; // Default to beyond bottom (no winning cells)
                        if (isWinScenario && winningCellsInColumn > 0) {
                            columnIndices.forEach(idx => {
                                if (winningCells.includes(idx) || fadingCells.includes(idx)) {
                                    const row = Math.floor(idx / 3);
                                    topmostWinningRow = Math.min(topmostWinningRow, row);
                                }
                            });
                        }

                        return (
                            <div key={colIndex} className='flex-1 flex flex-col gap-2 overflow-hidden'>
                                {/* Main column cells */}
                                {columnIndices.map((cellIndex) => {
                                    const cell = board[cellIndex];
                                    const cellRow = Math.floor(cellIndex / 3);

                                    // Determine if this cell should animate
                                    // In win scenario: only cells below topmost winning cell should animate
                                    // In draw scenario: all cells should animate
                                    let shouldAnimate = false;
                                    if (isDrawScenario) {
                                        shouldAnimate = true;
                                    } else if (isWinScenario && cellRow > topmostWinningRow) {
                                        shouldAnimate = true;
                                    }

                                    // Calculate transform for this specific cell
                                    let cellTransform = 'none';
                                    if (shouldAnimate) {
                                        if (isDrawScenario) {
                                            // Move up by one full cell height + one gap (0.5rem for gap-2)
                                            cellTransform = 'translateY(calc(-100% - 0.5rem))';
                                        } else if (isWinScenario && isSliding) {
                                            // Count how many winning cells are above this cell in the same column
                                            let winningCellsAbove = 0;
                                            columnIndices.forEach(idx => {
                                                const idxRow = Math.floor(idx / 3);
                                                if ((winningCells.includes(idx) || fadingCells.includes(idx)) && idxRow < cellRow) {
                                                    winningCellsAbove++;
                                                }
                                            });

                                            // Move up by (number of winning cells above) * (100% cell height + 0.5rem gap)
                                            // gap-2 in Tailwind is 0.5rem
                                            if (winningCellsAbove > 0) {
                                                const gapSize = winningCellsAbove * 0.5;
                                                cellTransform = `translateY(calc(-${winningCellsAbove * 100}% - ${gapSize}rem))`;
                                            }
                                        }
                                    }

                                    // Determine if cell should be invisible
                                    // During fading: fadingCells contains it
                                    // During sliding: winningCells contains it (keep invisible until board updates)
                                    const shouldBeInvisible = fadingCells.includes(cellIndex) ||
                                                             (winningCells.includes(cellIndex) && isSliding);

                                    return (
                                        <button
                                            key={cellIndex}
                                            onClick={() => handleCellClick(cellIndex)}
                                            disabled={!!cell || isAnimating || fadingCells.length > 0 || (gameMode === 'ai' && currentPlayer === 'O')}
                                            className={`
                                                aspect-square
                                                bg-white dark:bg-gray-800
                                                border-4 border-gray-300 dark:border-gray-600
                                                rounded-lg
                                                text-6xl font-bold
                                                hover:bg-gray-50 dark:hover:bg-gray-700
                                                cursor-pointer disabled:cursor-not-allowed
                                                ${cell === 'X' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}
                                                ${!cell && !isAnimating && fadingCells.length === 0 && !(gameMode === 'ai' && currentPlayer === 'O') ? 'hover:border-blue-400 dark:hover:border-blue-500' : ''}
                                                ${shouldBeInvisible ? 'opacity-0' : 'opacity-100'}
                                                ${winningCells.includes(cellIndex) && !isSliding ? 'border-green-500 dark:border-green-400' : ''}
                                            `}
                                            style={{
                                                transform: cellTransform,
                                                transition: disableTransition ? 'none' : 'opacity 600ms, transform 600ms ease-in-out',
                                            }}
                                        >
                                            {cell}
                                        </button>
                                    );
                                })}

                                {/* Phantom cells for board shift (all columns) - only in draw scenario */}
                                {isDrawScenario && (
                                    <div
                                        className='aspect-square bg-white dark:bg-gray-800 border-4 border-gray-300 dark:border-gray-600 rounded-lg'
                                    />
                                )}

                                {/* Phantom cells for winner animation (only affected columns) */}
                                {isWinScenario && winningCellsInColumn > 0 && Array(winningCellsInColumn).fill(null).map((_, idx) => {
                                    // Phantom cells are at the bottom, so they need to move up by the number of winning cells
                                    const gapSize = winningCellsInColumn * 0.5;
                                    const phantomTransform = isSliding
                                        ? `translateY(calc(-${winningCellsInColumn * 100}% - ${gapSize}rem))`
                                        : 'none';

                                    return (
                                        <div
                                            key={`phantom-winner-${idx}`}
                                            className='aspect-square bg-white dark:bg-gray-800 border-4 border-gray-300 dark:border-gray-600 rounded-lg'
                                            style={{
                                                transform: phantomTransform,
                                                transition: disableTransition ? 'none' : 'transform 600ms ease-in-out',
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Controls */}
                <div className='flex gap-4'>
                    <Button onClick={resetGame}>
                        New Round
                    </Button>
                    <Button onClick={resetAll} variant='secondary'>
                        Change Mode
                    </Button>
                </div>
            </div>
        </PageContent>
    );
}
