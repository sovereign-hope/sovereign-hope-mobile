export type RootStackParamList = {
  Home: undefined;
  "Reading Plan": undefined;
  Today: undefined;
  Read: {
    passages: Array<{
      book: string;
      startChapter: number;
      endChapter: number;
      isMemory: boolean;
    }>;
    onComplete: () => void;
  };
};
