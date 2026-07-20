// Shared state + mutations for canonical gns_ virtual keys.
//
// Centralises the secret hygiene (remember on create/rotate, forget on
// disable/rotate-old) and the duplicate-submission guards so both the Settings
// section and the Integration Lab behave identically.

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ApiError,
  createKey,
  disableKey,
  listKeys,
  rotateKey,
  type CreatedVirtualKey,
  type CreateKeyInput,
  type VirtualKey,
} from "./api";
import { forgetSecret, rememberSecret } from "./keySecrets";
import { isApiConfigured } from "./env";

export interface VirtualKeysApi {
  keys: VirtualKey[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  mutatingId: string | null;
  reload: () => Promise<void>;
  create: (input: CreateKeyInput) => Promise<CreatedVirtualKey | null>;
  rotate: (id: string) => Promise<CreatedVirtualKey | null>;
  disable: (id: string) => Promise<void>;
}

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function useVirtualKeys(): VirtualKeysApi {
  const [keys, setKeys] = useState<VirtualKey[]>([]);
  const [loading, setLoading] = useState<boolean>(isApiConfigured());
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  // Guards against double-submit: a ref flips synchronously, before any state
  // update or await, so a second click in the same tick is a no-op.
  const createInFlight = useRef(false);
  const mutateInFlight = useRef(false);

  const reload = useCallback(async () => {
    if (!isApiConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const res = await listKeys();
      setKeys(res.items);
      setError(null);
    } catch (err) {
      setError(messageOf(err, "Failed to load API keys."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount
    void reload();
  }, [reload]);

  const create = useCallback(
    async (input: CreateKeyInput): Promise<CreatedVirtualKey | null> => {
      if (createInFlight.current) return null;
      createInFlight.current = true;
      setCreating(true);
      setError(null);
      try {
        const res = await createKey(input);
        rememberSecret(res.virtual_key.id, res.key);
        await reload();
        return res;
      } catch (err) {
        setError(messageOf(err, "Could not create the key."));
        throw err;
      } finally {
        createInFlight.current = false;
        setCreating(false);
      }
    },
    [reload],
  );

  const rotate = useCallback(
    async (id: string): Promise<CreatedVirtualKey | null> => {
      if (mutateInFlight.current) return null;
      mutateInFlight.current = true;
      setMutatingId(id);
      setError(null);
      try {
        const res = await rotateKey(id);
        forgetSecret(id); // the old key's secret is now useless — drop it
        rememberSecret(res.virtual_key.id, res.key);
        await reload();
        return res;
      } catch (err) {
        setError(messageOf(err, "Could not rotate the key."));
        throw err;
      } finally {
        mutateInFlight.current = false;
        setMutatingId(null);
      }
    },
    [reload],
  );

  const disable = useCallback(
    async (id: string): Promise<void> => {
      if (mutateInFlight.current) return;
      mutateInFlight.current = true;
      setMutatingId(id);
      setError(null);
      try {
        await disableKey(id);
        forgetSecret(id);
        await reload();
      } catch (err) {
        setError(messageOf(err, "Could not disable the key."));
        throw err;
      } finally {
        mutateInFlight.current = false;
        setMutatingId(null);
      }
    },
    [reload],
  );

  return { keys, loading, error, creating, mutatingId, reload, create, rotate, disable };
}
