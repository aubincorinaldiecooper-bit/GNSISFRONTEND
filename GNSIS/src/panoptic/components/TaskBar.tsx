// The landing's bar. It is a real input: what is typed is handed on exactly
// as typed (see taskFlow.ts for where it goes).

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRef, useState, type FormEvent, type MouseEvent } from "react";

import { useMotionPrefs } from "../motion";
import { ArrowIcon, SearchIcon } from "./Icons";

const AnimatedButton = motion.create(Button);
export const TASK_MAX_LENGTH = 2000;

export function TaskBar({ onSubmit }: { onSubmit: (task: string, input: HTMLInputElement | null) => void }) {
  const m = useMotionPrefs();
  const input = useRef<HTMLInputElement>(null);
  const [task, setTask] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!task.trim()) {
      input.current?.focus();
      return;
    }
    onSubmit(task, input.current);
  };

  // A press anywhere on the pill that is not the input or the button puts the
  // cursor in the input, the way a search field behaves.
  const focusInput = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest("input, button")) return;
    event.preventDefault();
    input.current?.focus();
  };

  return (
    <motion.form role="search" className="pn-taskbar" onSubmit={submit} onMouseDown={focusInput} whileHover="hover">
      <SearchIcon className="pn-taskbar-icon" />
      <Input
        variant="plain"
        ref={input}
        name="task"
        type="text"
        aria-label="Ask Panoptic"
        placeholder="show me the moment we reached the summit…"
        autoComplete="off"
        enterKeyHint="go"
        maxLength={TASK_MAX_LENGTH}
        value={task}
        onChange={(event) => setTask(event.target.value)}
      />
      <AnimatedButton variant="primary" size="icon" type="submit" className="pn-taskbar-go" aria-label="Ask" whileTap={m.tap} transition={m.spring}>
        <ArrowIcon size={24} strokeWidth={1.7} variants={{ hover: { x: m.nudge } }} transition={m.quick} />
      </AnimatedButton>
    </motion.form>
  );
}
