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

  it("renders image when photoURL is provided", () => {
    const screen = renderWithTheme(
      <MemberAvatar
        photoURL="https://example.com/jane.jpg"
        displayName="Jane Doe"
        size={40}
      />
    );

    expect(screen.getByLabelText("Photo of Jane Doe")).toBeTruthy();
  });

  it("falls back to initials after image load error", () => {
    const screen = renderWithTheme(
      <MemberAvatar
        photoURL="https://example.com/jane.jpg"
        displayName="Jane Doe"
        size={40}
      />
    );

    const image = screen.getByLabelText("Photo of Jane Doe");

    void act(() => {
      fireEvent(image, "error", { nativeEvent: { error: "load failed" } });
    });

    expect(screen.getByText("J")).toBeTruthy();
  });

  it("opens modal when photo avatar is tapped", () => {
    const screen = renderWithTheme(
      <MemberAvatar
        photoURL="https://example.com/jane.jpg"
        displayName="Jane Doe"
        size={40}
      />
    );

    void act(() => {
      fireEvent.press(screen.getByLabelText("Photo of Jane Doe"));
    });

    expect(screen.getByLabelText("Enlarged photo of Jane Doe")).toBeTruthy();
    expect(screen.getByText("Jane Doe")).toBeTruthy();
  });

  it("does not render modal for initials-only avatar", () => {
    const screen = renderWithTheme(
      <MemberAvatar photoURL={null} displayName="Jane Doe" size={40} />
    );

    expect(screen.queryByLabelText("Close photo")).toBeNull();
  });
});

/* eslint-enable unicorn/no-null */
