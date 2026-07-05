import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { registerPlayer } from './api';

const PLAYER_KEY = 'crossword_player';

export async function getOrCreatePlayer() {
  try {
    const stored = await AsyncStorage.getItem(PLAYER_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    const deviceId = uuid.v4();
    const res = await registerPlayer(deviceId, 'Player');
    const player = res.data;
    await AsyncStorage.setItem(PLAYER_KEY, JSON.stringify(player));
    return player;
  } catch (error) {
    console.error('Error getting/creating player:', error);
    // Return a fallback offline player
    const offlinePlayer = {
      id: 'offline',
      device_id: 'offline',
      display_name: 'Player',
      total_points: 0,
      puzzles_completed: 0,
    };
    return offlinePlayer;
  }
}

export async function updateStoredPlayer(player) {
  await AsyncStorage.setItem(PLAYER_KEY, JSON.stringify(player));
}

export async function clearPlayer() {
  await AsyncStorage.removeItem(PLAYER_KEY);
}
