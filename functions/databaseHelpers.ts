import type { Response } from 'express'
import type { database } from 'firebase-admin'

/**
 * Gets a value from Firebase database
 * @param ref - Firebase database reference function
 * @param path - Path to the value
 * @returns The value from the database
 */
export const getFirebaseValue = async <T = any>(
  ref: (path?: string) => database.Reference,
  path: string
): Promise<T> => {
  return ref(path)
    .once('value')
    .then((snap) => snap.val())
}

/**
 * Validates that it's the specified player's turn
 * @param playerOrder - Array of player IDs in turn order
 * @param currentPlayerIndex - Index of the current player
 * @param playerId - ID of the player to validate
 * @throws Error if it's not the player's turn
 */
export const validatePlayerTurn = (
  playerOrder: string[],
  currentPlayerIndex: number,
  playerId: string
): void => {
  const currentPlayerId = playerOrder[currentPlayerIndex]
  if (currentPlayerId !== playerId) {
    throw new Error('Not your turn')
  }
}

/**
 * Sends a successful response
 * @param res - Express response object
 * @param data - Optional data to send
 * @returns The response object
 */
export const sendSuccess = <T>(res: Response, data?: T): Response => {
  return data ? res.status(200).send(data) : res.sendStatus(200)
}

/**
 * Sends an error response
 * @param res - Express response object
 * @param statusCode - HTTP status code
 * @param message - Error message
 * @returns The response object
 */
export const sendError = (
  res: Response,
  statusCode: number,
  message: string
): Response => {
  return res.status(statusCode).json({ error: message })
}

/**
 * Handles errors in Cloud Functions
 * @param res - Express response object
 * @param functionName - Name of the function where the error occurred
 * @param error - The error object
 * @returns The response object
 */
export const handleFunctionError = (
  res: Response,
  functionName: string,
  error: unknown
): Response => {
  console.log(`${functionName} error:`, error)
  return res.status(500).json({ error: 'Internal server error' })
}
