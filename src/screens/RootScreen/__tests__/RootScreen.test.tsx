import React from "react";
import { cleanup, render, waitFor } from "jest/testUtils";
import { useNetInfo } from "@react-native-community/netinfo";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import * as SecureStore from "expo-secure-store";
import { RootScreen } from "../RootScreen";

jest.mock("expo-secure-store");

describe("RootScreen", () => {
  beforeEach(() => {
    (Google.useAuthRequest as jest.Mock).mockReturnValueOnce([
      jest.fn(),
      {},
      jest.fn(),
    ]);
    (Facebook.useAuthRequest as jest.Mock).mockReturnValueOnce([
      jest.fn(),
      jest.fn(),
      jest.fn(),
    ]);
    (useNetInfo as jest.Mock).mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  afterEach(cleanup);

  it("Shows the Landing Screen when a user token is not available", () => {
    const wrapper = render(<RootScreen />);
    expect(wrapper.getByText("Welcome!")).toBeTruthy();
    expect(wrapper).toMatchSnapshot();
  });

  it("Shows the Home screen when a user token is available", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("accessToken");
    const wrapper = render(<RootScreen />);
    expect(await waitFor(() => wrapper.getByText("Home Screen"))).toBeDefined();
    expect(wrapper).toMatchSnapshot();
  });
});
