import { Passage } from "src/app/utils";

export type RootStackParamList = {
  Home: undefined;
  "Reading Plan": undefined;
  "Available Plans": undefined;
  "This Week": undefined;
  Read: {
    passages: Array<Passage>;
    onComplete: () => void;
  };
  Settings: undefined;
  SettingsView: undefined;
  Sermons: undefined;
  PodcastView: undefined;
  "Font Size": undefined;
};
