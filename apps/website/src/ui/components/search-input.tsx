import { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./input-group";

export function SearchInput({
  className,
  ariaLabel,
  placeholder,
  value,
  onValueChange,
  disabled = false,
}: {
  className?: string;
  ariaLabel: string;
  placeholder: string;
  value: string;
  onValueChange?: (value: string, replace: boolean) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const isComposing = useRef(false);

  useEffect(() => {
    if (!isComposing.current) setDraft(value);
  }, [value]);

  const clear = () => {
    setDraft("");
    onValueChange?.("", false);
  };

  return (
    <InputGroup className={className}>
      <InputGroupInput
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={draft}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setDraft(next);
          if (!isComposing.current) onValueChange?.(next, true);
        }}
        onCompositionStart={() => {
          isComposing.current = true;
        }}
        onCompositionEnd={(event) => {
          const next = event.currentTarget.value;
          isComposing.current = false;
          setDraft(next);
          onValueChange?.(next, true);
        }}
        disabled={disabled}
      />
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      {draft && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="清除搜索"
            size="icon-xs"
            onClick={clear}
            disabled={disabled}
          >
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
