// Beautiful UI ChatComposer's composer region, MIT © 2026 Shane Levine.
// Controlled textarea/accessibility adaptation; see THIRD_PARTY_NOTICES.md.
import { useId, useRef, type ComponentProps, type ReactNode, type Ref } from "react"
import { ArrowUp, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea, type TextareaProps } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type ChatComposerProps = Omit<ComponentProps<"form">, "onSubmit" | "onChange" | "children"> & {
  value: string
  onValueChange: (value: string) => void
  // Receives trimmed, nonempty text. The caller owns pending/errors and clears
  // the controlled draft only after success; this component never discards it.
  onSubmit: (value: string) => void
  label: string
  placeholder?: string
  submitLabel?: string
  hideSubmit?: boolean
  disabled?: boolean
  loading?: boolean
  submitDisabled?: boolean
  // "pill" is upstream PromptBar's Pill: one row, full radius, round send.
  variant?: "default" | "plain" | "pill"
  leading?: ReactNode
  textareaRef?: Ref<HTMLTextAreaElement>
  footer?: ReactNode
  modelPicker?: ReactNode
  footerClassName?: string
  submitClassName?: string
  textareaProps?: Omit<TextareaProps, "value" | "defaultValue" | "onChange" | "disabled" | "aria-label" | "variant" | "children">
}

function ChatComposer({
  value,
  onValueChange,
  onSubmit,
  label,
  placeholder,
  submitLabel = "Send message",
  hideSubmit = false,
  disabled = false,
  loading = false,
  submitDisabled = false,
  variant = "default",
  leading,
  textareaRef,
  footer,
  modelPicker,
  footerClassName,
  submitClassName,
  textareaProps = {},
  className,
  ...formProps
}: ChatComposerProps) {
  const generatedId = useId()
  const composing = useRef(false)
  const { id = generatedId, className: textareaClassName, onKeyDown, onCompositionStart, onCompositionEnd, ...inputProps } = textareaProps
  const pill = variant === "pill"
  const blocked = disabled || loading
  const canSubmit = !blocked && !submitDisabled && value.trim().length > 0

  const submit = () => {
    if (canSubmit && !composing.current) onSubmit(value.trim())
  }

  return (
    <form
      {...formProps}
      data-slot="chat-composer"
      data-variant={variant}
      aria-busy={loading}
      className={cn(
        "mt-auto flex shrink-0 border border-line transition-[border-color,box-shadow] duration-150 focus-within:border-line-strong",
        pill
          ? "flex-row items-center gap-2 rounded-full bg-surface py-1.5 pr-1.5 pl-4 shadow-[var(--shadow-card)] [&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:text-ink-2"
          : "flex-col gap-2 rounded-control bg-field p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.035)] focus-within:shadow-[0_1px_2px_rgba(0,0,0,0.025)]",
        className
      )}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <label htmlFor={id} className="sr-only">{label}</label>
      {pill && leading}
      <Textarea
        {...inputProps}
        ref={textareaRef}
        id={id}
        variant={pill ? "plain" : variant}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        disabled={blocked}
        className={cn(
          "min-h-4.5 w-full resize-none rounded-none border-0 bg-transparent p-0 text-[13px] leading-[1.4] text-ink shadow-none outline-none placeholder:text-ink-3 focus-visible:ring-0",
          pill && "min-w-0 flex-1 overflow-hidden py-1.5 text-[14px] leading-5 whitespace-nowrap [scrollbar-width:none]",
          textareaClassName
        )}
        onCompositionStart={(event) => {
          composing.current = true
          onCompositionStart?.(event)
        }}
        onCompositionEnd={(event) => {
          composing.current = false
          onCompositionEnd?.(event)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          // keyCode 229 guards Safari's composition-end Enter ordering.
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !composing.current && event.nativeEvent.keyCode !== 229) {
            event.preventDefault()
            if (!event.repeat) submit()
          }
        }}
      />
      <div className={cn(
        "flex items-center justify-end gap-2",
        pill && "contents",
        footerClassName
      )} data-slot="chat-composer-footer">
        {modelPicker}
        {footer}
        {!hideSubmit && (
          <Button
            type="submit"
            variant="primary"
            size="icon"
            disabled={!canSubmit}
            aria-label={submitLabel}
            title={submitLabel}
            className={cn(
              "ml-auto size-7 rounded-control p-0 text-surface transition-[background-color,color,transform] duration-200 disabled:bg-line-strong disabled:text-ink-2 disabled:opacity-100",
              pill && "ml-0 size-8 shrink-0 rounded-full",
              submitClassName
            )}
          >
            {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="size-4" aria-hidden="true" />}
          </Button>
        )}
      </div>
    </form>
  )
}

export { ChatComposer }
export type { ChatComposerProps }
