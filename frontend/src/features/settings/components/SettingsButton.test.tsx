import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsButton } from "@/features/settings";
import type {
  AppSettings,
  ImpersonationCapabilities,
} from "@/features/settings/types";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const SETTINGS: AppSettings = {
  schemaVersion: 1,
  revision: 7,
  impersonation: {
    mode: "automatic",
    browser: "chrome",
    sites: [{ domain: "tiktok.com", mode: "always", browser: "chrome" }],
  },
};

const CAPABILITIES: ImpersonationCapabilities = {
  runtimes: [
    {
      id: "bundled",
      label: "Bundled yt-dlp",
      version: "2026.09.01",
      browsers: ["chrome", "edge"],
      error: null,
    },
    {
      id: "python-3.12",
      label: "Python 3.12",
      version: null,
      browsers: [],
      error: "curl_cffi is not installed",
    },
  ],
};

const invokeMock = vi.mocked(invoke);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function mockBackend(settings = SETTINGS, capabilities = CAPABILITIES) {
  invokeMock.mockImplementation(async (command) => {
    if (command === "get_settings") return structuredClone(settings);
    if (command === "get_impersonation_capabilities") {
      return structuredClone(capabilities);
    }
    if (command === "update_settings") return structuredClone(settings);
    throw new Error(`Unexpected command: ${command}`);
  });
}

async function openSettings(expectedDomain = "tiktok.com") {
  const user = userEvent.setup();
  render(<SettingsButton />);
  await user.click(screen.getByRole("button", { name: "Settings" }));
  await screen.findByRole("dialog", { name: "Settings" });
  await screen.findByDisplayValue(expectedDomain);
  return user;
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
) {
  await user.click(screen.getByRole("combobox", { name: label }));
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("SettingsButton", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    mockBackend();
  });

  it("loads settings and the available browser union when opened", async () => {
    const user = await openSettings();

    expect(
      screen.getByRole("combobox", { name: "Global behavior" }),
    ).toHaveTextContent("Automatic");
    await user.click(
      screen.getByRole("combobox", { name: "Preferred browser" }),
    );
    expect(screen.getByRole("option", { name: "Chrome" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Edge" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Firefox" }),
    ).not.toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith("get_settings", undefined);
    expect(invokeMock).toHaveBeenCalledWith("get_impersonation_capabilities", {
      refresh: false,
    });
  });

  it("discards draft edits when cancelled", async () => {
    const user = await openSettings();
    await chooseOption(user, "Global behavior", "Never impersonate");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(
      await screen.findByRole("combobox", { name: "Global behavior" }),
    ).toHaveTextContent("Automatic");
  });

  it("uses the normalized saved response as the current draft", async () => {
    let submitted: AppSettings | undefined;
    const normalized: AppSettings = {
      ...SETTINGS,
      revision: 8,
      impersonation: {
        ...SETTINGS.impersonation,
        sites: [{ domain: "example.com", mode: "always", browser: null }],
      },
    };
    invokeMock.mockImplementation(async (command, args) => {
      if (command === "get_settings") return structuredClone(SETTINGS);
      if (command === "get_impersonation_capabilities") {
        return structuredClone(CAPABILITIES);
      }
      if (command === "update_settings") {
        submitted = (args as { settings: AppSettings }).settings;
        return structuredClone(normalized);
      }
      throw new Error(`Unexpected command: ${command}`);
    });
    const user = await openSettings();
    await user.clear(screen.getByLabelText("Site domain"));
    await user.type(
      screen.getByLabelText("Site domain"),
      "https://EXAMPLE.com/watch",
    );
    await chooseOption(user, "Browser for site 1", "Use global browser");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Settings saved.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("example.com")).toBeInTheDocument();
    expect(submitted?.impersonation.sites).toEqual([
      {
        domain: "https://EXAMPLE.com/watch",
        mode: "always",
        browser: null,
      },
    ]);
  });

  it("keeps the draft and shows an error when saving fails", async () => {
    invokeMock.mockImplementation(async (command) => {
      if (command === "get_settings") return structuredClone(SETTINGS);
      if (command === "get_impersonation_capabilities") {
        return structuredClone(CAPABILITIES);
      }
      if (command === "update_settings") throw "The settings changed on disk";
      throw new Error(`Unexpected command: ${command}`);
    });
    const user = await openSettings();
    const domain = screen.getByLabelText("Site domain");
    await user.clear(domain);
    await user.type(domain, "example.org");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The settings changed on disk",
    );
    expect(screen.getByDisplayValue("example.org")).toBeInTheDocument();
  });

  it("rejects duplicate hosts from pasted URLs before saving", async () => {
    const user = await openSettings();
    await user.click(screen.getByRole("button", { name: "Add site" }));
    const domains = screen.getAllByLabelText("Site domain");
    await user.type(domains[1], "https://TIKTOK.com/video/123");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getAllByText("This site is already listed.")).toHaveLength(2);
    expect(invokeMock).not.toHaveBeenCalledWith(
      "update_settings",
      expect.anything(),
    );
  });

  it("requires a domain before saving a new site", async () => {
    const user = await openSettings();
    await user.click(screen.getByRole("button", { name: "Add site" }));

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Domain is required.")).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalledWith(
      "update_settings",
      expect.anything(),
    );
  });

  it("removes a site rule from the saved settings", async () => {
    let submitted: AppSettings | undefined;
    invokeMock.mockImplementation(async (command, args) => {
      if (command === "get_settings") return structuredClone(SETTINGS);
      if (command === "get_impersonation_capabilities") {
        return structuredClone(CAPABILITIES);
      }
      if (command === "update_settings") {
        submitted = (args as { settings: AppSettings }).settings;
        return {
          ...structuredClone(SETTINGS),
          impersonation: { ...SETTINGS.impersonation, sites: [] },
        };
      }
      throw new Error(`Unexpected command: ${command}`);
    });
    const user = await openSettings();

    await user.click(screen.getByRole("button", { name: "Remove tiktok.com" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("Settings saved.");
    expect(submitted?.revision).toBe(7);
    expect(submitted?.impersonation.sites).toEqual([]);
  });

  it("preserves a surviving row and its focus when an earlier rule is removed", async () => {
    mockBackend({
      ...SETTINGS,
      impersonation: {
        ...SETTINGS.impersonation,
        sites: [
          { domain: "first.example", mode: "automatic", browser: null },
          { domain: "second.example", mode: "always", browser: "edge" },
        ],
      },
    });
    const user = await openSettings("first.example");
    const domains = screen.getAllByLabelText("Site domain");
    await user.clear(domains[1]);
    await user.type(domains[1], "survivor.example");
    domains[1].focus();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove first.example" }),
    );

    expect(screen.getByDisplayValue("survivor.example")).toBe(domains[1]);
    expect(domains[1]).toHaveFocus();
    expect(
      screen.getByRole("combobox", { name: "Behavior for site 1" }),
    ).toHaveTextContent("Always impersonate");
  });

  it("preserves an unavailable configured browser", async () => {
    mockBackend({
      ...SETTINGS,
      impersonation: { ...SETTINGS.impersonation, browser: "safari" },
    });

    await openSettings();

    expect(
      screen.getByRole("combobox", { name: "Preferred browser" }),
    ).toHaveTextContent("Safari (unavailable)");
    expect(
      screen.getByText(/falls back to other available profiles/i),
    ).toBeInTheDocument();
  });

  it("refreshes capabilities and exposes engine diagnostics", async () => {
    const noProfiles: ImpersonationCapabilities = {
      runtimes: [
        {
          id: "bundled",
          label: "Bundled yt-dlp",
          version: "2026.09.01",
          browsers: [],
          error: "No supported impersonation profiles",
        },
      ],
    };
    mockBackend(SETTINGS, noProfiles);
    const user = await openSettings();

    expect(
      screen.getByText("No browser profiles are currently available."),
    ).toBeInTheDocument();
    await user.click(screen.getByText("Engine diagnostics"));
    const diagnostics = screen.getByText("Bundled yt-dlp").closest("li");
    expect(within(diagnostics!).getByText("2026.09.01")).toBeInTheDocument();
    expect(
      within(diagnostics!).getByText("No supported impersonation profiles"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Refresh capabilities" }),
    );
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        "get_impersonation_capabilities",
        {
          refresh: true,
        },
      );
    });
  });

  it("shows load failures and allows retrying", async () => {
    invokeMock.mockRejectedValueOnce("Unable to read settings");
    const user = userEvent.setup();
    render(<SettingsButton />);
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to read settings",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByDisplayValue("tiktok.com")).toBeInTheDocument();
  });

  it("ignores an older load that finishes after the dialog is reopened", async () => {
    const firstSettings = deferred<AppSettings>();
    const firstCapabilities = deferred<ImpersonationCapabilities>();
    const secondSettings = deferred<AppSettings>();
    const secondCapabilities = deferred<ImpersonationCapabilities>();
    const settingsResponses = [firstSettings.promise, secondSettings.promise];
    const capabilityResponses = [
      firstCapabilities.promise,
      secondCapabilities.promise,
    ];
    invokeMock.mockImplementation(async (command) => {
      if (command === "get_settings") return await settingsResponses.shift()!;
      if (command === "get_impersonation_capabilities") {
        return await capabilityResponses.shift()!;
      }
      throw new Error(`Unexpected command: ${command}`);
    });
    const user = userEvent.setup();
    render(<SettingsButton />);

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await screen.findByText("Loading settings…");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(4));

    const newest = {
      ...SETTINGS,
      revision: 8,
      impersonation: {
        ...SETTINGS.impersonation,
        sites: [
          { domain: "new.example", mode: "always" as const, browser: null },
        ],
      },
    };
    await act(async () => {
      secondSettings.resolve(newest);
      secondCapabilities.resolve(CAPABILITIES);
      await Promise.all([secondSettings.promise, secondCapabilities.promise]);
    });
    expect(await screen.findByDisplayValue("new.example")).toBeInTheDocument();

    await act(async () => {
      firstSettings.resolve(SETTINGS);
      firstCapabilities.resolve(CAPABILITIES);
      await Promise.all([firstSettings.promise, firstCapabilities.promise]);
    });
    expect(screen.getByDisplayValue("new.example")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("tiktok.com")).not.toBeInTheDocument();
  });

  it("locks the draft and prevents closing while a save is pending", async () => {
    const pendingSave = deferred<AppSettings>();
    invokeMock.mockImplementation(async (command) => {
      if (command === "get_settings") return structuredClone(SETTINGS);
      if (command === "get_impersonation_capabilities") {
        return structuredClone(CAPABILITIES);
      }
      if (command === "update_settings") return await pendingSave.promise;
      throw new Error(`Unexpected command: ${command}`);
    });
    const user = await openSettings();

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByLabelText("Site domain")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add site" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(
      screen.getByRole("dialog", { name: "Settings" }),
    ).toBeInTheDocument();

    await act(async () => {
      pendingSave.resolve({ ...SETTINGS, revision: 8 });
      await pendingSave.promise;
    });
    expect(await screen.findByText("Settings saved.")).toBeInTheDocument();
    expect(screen.getByLabelText("Site domain")).toBeEnabled();
  });
});
