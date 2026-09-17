import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TextEditor } from "./TextCell";

describe("TextEditor", () => {
  it("calls onChange with new text on blur", () => {
    const onChange = vi.fn();
    render(<TextEditor column={{ id: "c", type: "text", settings: {} }} members={[]} value={{ text: "a" }} onChange={onChange} />);
    const input = screen.getByDisplayValue("a");
    fireEvent.change(input, { target: { value: "b" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({ text: "b" });
  });
});
