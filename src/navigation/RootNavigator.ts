import { Passage } from "src/app/utils";

export type RootStackParamList = {
  Home: undefined;
  "Reading Plan": undefined;
  Today: undefined;
  Read: {
    passages: Array<Passage>;
    onComplete: () => void;
  };
  Settings: undefined;
  SettingsView: undefined;
};
