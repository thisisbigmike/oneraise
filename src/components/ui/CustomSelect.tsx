'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type CustomSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  /** Optional URL for a circular icon (e.g. token logo) rendered before the label. */
  iconUrl?: string;
};

type CustomSelectProps = {
  id?: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function CustomSelect({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const listboxId = `${selectId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const selectedOption = options.find((option) => option.value === value);
  const getFocusableIndex = (preferredIndex: number, direction: 1 | -1 = 1) => {
    if (!options.length) return 0;
    let nextIndex = preferredIndex;
    for (let step = 0; step < options.length; step += 1) {
      const option = options[nextIndex];
      if (option && !option.disabled) return nextIndex;
      nextIndex = (nextIndex + direction + options.length) % options.length;
    }
    return preferredIndex;
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => optionRefs.current[activeIndex]?.focus());
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;

    const updateMenuPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      setMenuStyle({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        right: 'auto',
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open]);

  const moveActive = (direction: 1 | -1) => {
    const enabledOptions = options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !option.disabled);
    if (!enabledOptions.length) return;

    const currentEnabledIndex = enabledOptions.findIndex(({ index }) => index === activeIndex);
    const nextEnabledIndex =
      currentEnabledIndex === -1
        ? 0
        : (currentEnabledIndex + direction + enabledOptions.length) % enabledOptions.length;
    const nextIndex = enabledOptions[nextEnabledIndex].index;
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  };

  const selectOption = (option: CustomSelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const openFromTrigger = (nextIndex = selectedIndex) => {
    if (disabled) return;
    setActiveIndex(getFocusableIndex(nextIndex));
    setOpen(true);
  };

  const menu = open && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={menuRef}
        className="or-select-menu"
        style={menuStyle}
        role="listbox"
        id={listboxId}
        aria-labelledby={selectId}
      >
        {options.map((option, index) => (
          <button
            key={option.value}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            type="button"
            role="option"
            aria-selected={option.value === value}
            className={`or-select-option ${option.value === value ? 'is-selected' : ''}`}
            disabled={option.disabled}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => selectOption(option)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveActive(1);
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveActive(-1);
              }
              if (event.key === 'Home') {
                event.preventDefault();
                const firstIndex = getFocusableIndex(0);
                setActiveIndex(firstIndex);
                optionRefs.current[firstIndex]?.focus();
              }
              if (event.key === 'End') {
                event.preventDefault();
                const lastIndex = getFocusableIndex(options.length - 1, -1);
                setActiveIndex(lastIndex);
                optionRefs.current[lastIndex]?.focus();
              }
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectOption(option);
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
                triggerRef.current?.focus();
              }
            }}
          >
            <span className="or-select-option-label">
              {option.iconUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={option.iconUrl} alt="" className="or-select-icon" width={20} height={20} />
              )}
              {option.label}
            </span>
            {option.value === value && (
              <svg className="or-select-check" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3.5 8.3l3 3 6-6.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        ))}
      </div>,
      document.body,
    )
    : null;

  return (
    <div className={`or-select ${open ? 'is-open' : ''} ${className}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        className="or-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openFromTrigger())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            openFromTrigger(selectedIndex);
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            openFromTrigger(selectedIndex);
          }
          if (event.key === 'Home') {
            event.preventDefault();
            openFromTrigger(getFocusableIndex(0));
          }
          if (event.key === 'End') {
            event.preventDefault();
            openFromTrigger(getFocusableIndex(options.length - 1, -1));
          }
        }}
      >
        <span className={selectedOption ? 'or-select-value' : 'or-select-placeholder'}>
          {selectedOption?.iconUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={selectedOption.iconUrl} alt="" className="or-select-icon" width={20} height={20} />
          )}
          {selectedOption?.label || placeholder}
        </span>
        <span className="or-select-chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {menu}
    </div>
  );
}
