"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Command, CornerDownLeft, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { commandGroups, searchDishaCommands, type DishaCommand } from "@/lib/command-registry";
import styles from "./dashboard.module.css";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const commands = useMemo(() => searchDishaCommands(query), [query]);
  const groups = commandGroups(commands);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function activate(command: DishaCommand) {
    if (!command.href) return;
    setOpen(false);
    setQuery("");
    window.location.assign(command.href);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className={styles.commandTrigger} type="button" aria-label="Open disha6.6 command palette">
          <Command size={15} />
          <span>Command</span>
          <kbd>⌘K</kbd>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.commandOverlay} />
        <Dialog.Content className={styles.commandDialog} aria-describedby="disha-command-description">
          <header className={styles.commandDialogHeader}>
            <div>
              <Dialog.Title>disha6.6 Command</Dialog.Title>
              <Dialog.Description id="disha-command-description">
                Search governed commands. Commands without an implemented adapter are visible but cannot execute.
              </Dialog.Description>
            </div>
            <Dialog.Close className={styles.commandClose} aria-label="Close command palette">
              <X size={16} />
            </Dialog.Close>
          </header>

          <label className={styles.commandSearch}>
            <Search size={18} />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type /map, /evidence, /source, /mission…"
              spellCheck={false}
            />
          </label>

          <div className={styles.commandList} role="listbox" aria-label="disha6.6 commands">
            {commands.length === 0 ? <p className={styles.commandEmpty}>No matching governed command.</p> : null}
            {groups.map((group) => (
              <section className={styles.commandGroup} key={group}>
                <h3>{group}</h3>
                {commands.filter((command) => command.group === group).map((command) => (
                  <button
                    aria-disabled={!command.href}
                    aria-selected={false}
                    className={command.href ? styles.commandItem : styles.commandItemPlanned}
                    key={command.id}
                    onClick={() => activate(command)}
                    role="option"
                    type="button"
                  >
                    <div className={styles.commandItemMain}>
                      <code>{command.trigger}</code>
                      <strong>{command.label}</strong>
                      <span>{command.description}</span>
                    </div>
                    <div className={styles.commandMeta}>
                      <span>{command.safety.replaceAll("_", " ")}</span>
                      <b>{command.href ? "Ready" : "Adapter required"}</b>
                      {command.href ? <CornerDownLeft size={14} /> : null}
                    </div>
                  </button>
                ))}
              </section>
            ))}
          </div>
          <footer className={styles.commandFooter}>
            <span>Ctrl+K / Cmd+K</span>
            <span>No arbitrary execution · policy boundary preserved</span>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
