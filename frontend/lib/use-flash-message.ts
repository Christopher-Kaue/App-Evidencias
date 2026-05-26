"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULT_SUCCESS = "Salvo com sucesso.";
const DEFAULT_TIMEOUT_MS = 4500;

export function useFlashMessage(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), timeoutMs);
    return () => clearTimeout(timer);
  }, [message, timeoutMs]);

  const clear = useCallback(() => setMessage(""), []);

  const showSuccess = useCallback((text = DEFAULT_SUCCESS) => {
    setMessage(text);
  }, []);

  const show = useCallback((text: string) => {
    setMessage(text);
  }, []);

  return { message, showSuccess, show, clear };
}
