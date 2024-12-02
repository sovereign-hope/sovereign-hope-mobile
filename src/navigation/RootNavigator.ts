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
  Resources: undefined;
  PodcastView: undefined;
  "Font Size": undefined;
  Schedule: undefined;
  Signups: undefined;
  Sundays: undefined;
};
