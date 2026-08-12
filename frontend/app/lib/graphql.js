import { nhost } from "./nhost";

export async function gqlRequest(query, variables = {}) {
  const res = await nhost.graphql.request({ query, variables });
  if (res.body.errors?.length) {
    throw new Error(res.body.errors.map((e) => e.message).join("; "));
  }
  return res.body.data;
}
