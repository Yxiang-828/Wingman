interface ElectronAPI {
  db: {
    // ...existing methods...
    deleteDiaryEntry: (id: number) => Promise<{ success: boolean; deletedId: number }>;
    // ...existing methods...
  };
}