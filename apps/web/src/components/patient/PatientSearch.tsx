"use client";

/**
 * Patient search component with autocomplete
 * Supports Vietnamese name search
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PatientStatusBadge } from "./PatientStatusBadge";
import { usePatientSearch } from "@/hooks/usePatients";
import { cn, debounce } from "@/lib/utils";
import { Search, Loader2, X } from "lucide-react";
import type { Patient } from "@/types/patient";

interface PatientSearchProps {
  onSelect?: (patient: Patient) => void;
  placeholder?: string;
  className?: string;
  locale?: string;
  autoFocus?: boolean;
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function PatientSearch({
  onSelect,
  placeholder = "Tim kiem benh nhan...",
  className,
  locale = "vi",
  autoFocus = false,
}: PatientSearchProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Debounce search query
  const debouncedSetQuery = React.useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedQuery(value);
      }, 300),
    []
  );

  // Search patients
  const { data: patients, isLoading } = usePatientSearch(debouncedQuery);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSetQuery(value);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  // Handle patient selection
  const handleSelect = (patient: Patient) => {
    setQuery("");
    setDebouncedQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);

    if (onSelect) {
      onSelect(patient);
    } else {
      router.push(`/${locale}/patients/${patient.id}`);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !patients?.length) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < patients.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && patients[selectedIndex]) {
          handleSelect(patients[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll selected item into view
  React.useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-patient-item]");
      items[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const showDropdown = isOpen && (isLoading || (patients && patients.length > 0));

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
          autoFocus={autoFocus}
          aria-label="Tim kiem benh nhan"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          role="combobox"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-80 overflow-auto"
          role="listbox"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Dang tim kiem...
              </span>
            </div>
          ) : patients && patients.length > 0 ? (
            <div className="py-1">
              {patients.map((patient, index) => {
                const displayName =
                  locale === "en" && patient.nameEn
                    ? patient.nameEn
                    : patient.nameVi;

                return (
                  <button
                    key={patient.id}
                    type="button"
                    data-patient-item
                    onClick={() => handleSelect(patient)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    )}
                    role="option"
                    aria-selected={index === selectedIndex}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={patient.photoUrl} alt={displayName} />
                      <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{displayName}</span>
                        <PatientStatusBadge status={patient.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        MRN: {patient.mrn} | {patient.phone}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Khong tim thay benh nhan
            </div>
          )}
        </div>
      )}
    </div>
  );
}
