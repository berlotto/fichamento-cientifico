"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CreateProjectState = { error?: string };

export async function createProject(
  _: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe um nome." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").insert({ name }).select("id").single();
  if (error || !data) return { error: "Não foi possível criar o projeto." };

  redirect(`/projects/${data.id}`);
}
