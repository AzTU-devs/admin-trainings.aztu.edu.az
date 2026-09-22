import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthField } from "./AuthCard";

describe("AuthField", () => {
  // The "Forgot password?" link shows on the Password label's row, but Tab
  // from the field above must land in the password box, not on the link.
  it("keeps the label-row aside after the control in tab order", async () => {
    render(
      <form>
        <AuthField label="Email" htmlFor="email">
          <input id="email" />
        </AuthField>
        <AuthField label="Password" htmlFor="password" aside={<a href="/forgot">Forgot password?</a>}>
          <input id="password" type="password" />
        </AuthField>
      </form>,
    );

    screen.getByLabelText("Email").focus();
    await userEvent.tab();
    expect(screen.getByLabelText("Password")).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveFocus();
  });
});
