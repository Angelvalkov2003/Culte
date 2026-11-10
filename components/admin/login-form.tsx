"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/_actions/auth";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/admin/action-form";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <Field label="Парола" htmlFor="password" error={state?.error}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus
          aria-invalid={!!state?.error} />
      </Field>
      <SubmitButton size="md" className="w-full">
        Вход
      </SubmitButton>
    </form>
  );
}
