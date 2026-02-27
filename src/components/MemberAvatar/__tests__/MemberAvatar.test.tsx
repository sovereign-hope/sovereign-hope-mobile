/* eslint-disable unicorn/no-null */
import React from "react";
import { ThemeProvider, DefaultTheme } from "@react-navigation/native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { MemberAvatar } from "../MemberAvatar";

const renderWithTheme = (component: React.ReactElement) =>
  render(<ThemeProvider value={DefaultTheme}>{component}</ThemeProvider>);

describe("MemberAvatar", () => {
  it("renders initials fallback when photoURL is missing", () => {
    const screen = renderWithTheme(
      <MemberAvatar photoURL={null} displayName="Jane Doe" size={40} />
    );

    expect(screen.getByText("J")).toBeTruthy();
  });

  it("renders image when photoURL exists and falls back after load error", () => {
    const screen = renderWithTheme(
      <MemberAvatar
        photoURL="https://example.com/jane.jpg"
        displayName="Jane Doe"
        size={40}
      />
    );

    const image = screen.getByLabelText("Photo of Jane Doe");
    expect(image).toBeTruthy();

    void act(() => {
      fireEvent(image, "error");
    });
    expect(screen.getByText("J")).toBeTruthy();
  });
});

/* eslint-enable unicorn/no-null */
