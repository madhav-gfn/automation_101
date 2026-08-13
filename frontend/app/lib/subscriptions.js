"use client";

import { useEffect, useState } from "react";
import { createClient } from "graphql-ws";
import { nhost } from "./nhost";

let wsClient = null;

function getWsClient() {
  if (wsClient) return wsClient;
  const wsUrl = nhost.graphql.url.replace(/^http/, "ws");
  wsClient = createClient({
    url: wsUrl,
    connectionParams: () => {
      const session = nhost.getUserSession();
      return session ? { headers: { Authorization: `Bearer ${session.accessToken}` } } : {};
    },
  });
  return wsClient;
}

function describeSubscriptionError(err) {
  if (err?.message) return err.message;
  if (typeof Event !== "undefined" && err instanceof Event) return "Connection lost, retrying…";
  return String(err);
}

export function useSubscription(query, variables, { skip = false } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const variablesKey = JSON.stringify(variables ?? {});

  useEffect(() => {
    if (skip) return undefined;
    const client = getWsClient();
    let active = true;
    const unsubscribe = client.subscribe(
      { query, variables: JSON.parse(variablesKey) },
      {
        next: (result) => {
          if (!active) return;
          if (result.errors?.length) {
            setError(result.errors.map((e) => e.message).join("; "));
          } else {
            setData(result.data);
            setError(null);
          }
        },
        error: (err) => {
          if (active) setError(describeSubscriptionError(err));
        },
        complete: () => {},
      }
    );
    return () => {
      active = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, variablesKey, skip]);

  return { data, error };
}
