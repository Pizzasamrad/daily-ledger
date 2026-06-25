import { supabase } from "./supabaseClient.js";

const TABLE = "ledger_kv";

export const storage = {
  async get(key) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { key, value: JSON.stringify(data.value) };
  },

  async set(key, value) {
    const parsed = JSON.parse(value);
    const { error } = await supabase
      .from(TABLE)
      .upsert({ key, value: parsed }, { onConflict: "key" });
    if (error) throw error;
    return { key, value, shared: false };
  },

  async delete(key) {
    const { error } = await supabase.from(TABLE).delete().eq("key", key);
    if (error) throw error;
    return { key, deleted: true };
  },
};
