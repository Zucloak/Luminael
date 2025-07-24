export const savePlayerState = (state: any) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem('musicPlayerState', serializedState);
  } catch (error) {
    console.error('Error saving music player state:', error);
  }
};

export const loadPlayerState = () => {
  try {
    const serializedState = localStorage.getItem('musicPlayerState');
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (error) {
    console.error('Error loading music player state:', error);
    return undefined;
  }
};
