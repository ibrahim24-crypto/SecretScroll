"use client"

import * as React from "react"
import { Check, Globe } from "lucide-react"
import { useLocale } from "@/hooks/useLocale"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const LANGUAGES = [
    { name: 'English', code: 'en' },
    { name: 'Français', code: 'fr' },
    { name: 'العربية', code: 'ar' },
];

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
            <DropdownMenuItem key={lang.code} onClick={() => setLocale(lang.code as any)}>
                <span>{lang.name}</span>
                {locale === lang.code && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
