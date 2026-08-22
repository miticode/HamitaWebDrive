"use client";

import { useActionState } from "react";
import { Logo } from "@/components/Logo";
import { loginAction, type ActionState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    loginAction,
    {}
  );

  return (
    <form action={action} className="mx-auto mt-32 w-full max-w-xs px-6 text-center">
      <Logo size="md" className="mx-auto" />
      <h1 className="rule mt-6 font-display text-2xl font-light">Đăng nhập</h1>
      <input
        type="password"
        name="password"
        autoFocus
        placeholder="Mật khẩu"
        className="input mt-8 text-center"
      />
      {state.error && (
        <p className="mt-2 text-sm text-red-700">{state.error}</p>
      )}
      <button
        disabled={pending}
        className="btn-primary mt-3 w-full justify-center"
      >
        {pending ? "Đang kiểm tra…" : "Vào"}
      </button>
    </form>
  );
}
