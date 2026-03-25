import { initGraphQLTada } from "gql.tada";
import type { introspection } from "../admin-api-env";

export const adminApi = initGraphQLTada<{
  introspection: introspection;
}>();

export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada";
export { readFragment } from "gql.tada";
