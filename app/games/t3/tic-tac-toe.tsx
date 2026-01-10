// app/games/t3/tic-tac-toe.tsx

'use client';

import { useState, useEffect } from 'react';
import PageContent from '@/app/ui/layout/page/page-content';
import PageHeader from '@/app/ui/layout/page-header';
import { Button } from '@/app/ui/button';

type Player = 'X' | 'O' | null;
type Board = Player[];
type GameMode = 'pvp' | 'ai';

const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
];

const checkWinner = (board: Board): Player => {
    for (const [a, b, c] of WINNING_COMBINATIONS) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
};

const isBoardFull = (board: Board): boolean => {
    return board.every(cell => cell !== null);
};

const getBestMove = (board: Board): number => {
    // Simple AI using minimax algorithm
    const minimax = (currentBoard: Board, isMaximizing: boolean): number => {
        const winner = checkWinner(currentBoard);

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

export default function TicTacToe() {
    const [board, setBoard] = useState<Board>(Array(9).fill(null));
    const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
    const [winner, setWinner] = useState<Player>(null);
    const [isDraw, setIsDraw] = useState(false);
    const [gameMode, setGameMode] = useState<GameMode | null>(null);
    const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });

    useEffect(() => {
        if (gameMode === 'ai' && currentPlayer === 'O' && !winner && !isDraw) {
            // AI makes a move after a short delay
            const timer = setTimeout(() => {
                const aiMove = getBestMove([...board]);
                if (aiMove !== -1) {
                    handleCellClick(aiMove);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [currentPlayer, gameMode, winner, isDraw, board]);

    const handleCellClick = (index: number) => {
        if (board[index] || winner || isDraw || !gameMode) return;
        if (gameMode === 'ai' && currentPlayer === 'O') return; // Prevent clicking during AI turn

        const newBoard = [...board];
        newBoard[index] = currentPlayer;
        setBoard(newBoard);

        const gameWinner = checkWinner(newBoard);
        if (gameWinner) {
            setWinner(gameWinner);
            setScores(prev => ({ ...prev, [gameWinner]: prev[gameWinner] + 1 }));
        } else if (isBoardFull(newBoard)) {
            setIsDraw(true);
            setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
        } else {
            setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
        }
    };

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setCurrentPlayer('X');
        setWinner(null);
        setIsDraw(false);
    };

    const resetAll = () => {
        resetGame();
        setGameMode(null);
        setScores({ X: 0, O: 0, draws: 0 });
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
                    subtitle='Classic Tic-Tac-Toe game'
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
                    <div className='bg-gray-100 dark:bg-gray-700 px-6 py-3 rounded-lg'>
                        <div className='text-2xl font-bold text-gray-600 dark:text-gray-300'>
                            {scores.draws}
                        </div>
                        <div className='text-sm text-gray-600 dark:text-gray-400'>
                            Draws
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
                    {winner ? (
                        <h2 className='text-3xl font-bold text-green-600 dark:text-green-400'>
                            {winner} Wins!
                        </h2>
                    ) : isDraw ? (
                        <h2 className='text-3xl font-bold text-gray-600 dark:text-gray-400'>
                            It&apos;s a Draw!
                        </h2>
                    ) : (
                        <h2 className='text-2xl font-semibold text-gray-700 dark:text-gray-300'>
                            Current Turn: <span className={currentPlayer === 'X' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}>
                                {currentPlayer}
                            </span>
                        </h2>
                    )}
                </div>

                {/* Game Board */}
                <div className='grid grid-cols-3 gap-2 w-full max-w-md aspect-square'>
                    {board.map((cell, index) => (
                        <button
                            key={index}
                            onClick={() => handleCellClick(index)}
                            disabled={!!cell || !!winner || isDraw || (gameMode === 'ai' && currentPlayer === 'O')}
                            className={`
                                aspect-square
                                bg-white dark:bg-gray-800
                                border-4 border-gray-300 dark:border-gray-600
                                rounded-lg
                                text-6xl font-bold
                                transition-all
                                hover:bg-gray-50 dark:hover:bg-gray-700
                                disabled:cursor-not-allowed
                                ${cell === 'X' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}
                                ${!cell && !winner && !isDraw && !(gameMode === 'ai' && currentPlayer === 'O') ? 'hover:border-blue-400 dark:hover:border-blue-500' : ''}
                            `}
                        >
                            {cell}
                        </button>
                    ))}
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
