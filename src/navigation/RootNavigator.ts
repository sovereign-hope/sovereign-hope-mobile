import { Passage } from "src/app/utils";

export type RootStackParamList = {
  Home: undefined;
  "Reading Plan": undefined;
  "Available Plans": undefined;
  "This Week": undefined;
  Church: undefined;
  Members: undefined;
  "Member Directory": undefined;
  "Daily Prayer": undefined;
  Read: {
    passages: Array<Passage>;
    onComplete: () => void;
  };
  Settings: undefined;
  "Account Sign In": undefined;
  SettingsView: undefined;
  Resources: undefined;
  PodcastView: undefined;
  "Font Size": undefined;
  Schedule: undefined;
  Signups: undefined;
  Sundays: undefined;
};
