"use server";

import { revalidatePath } from "next/cache";
import { endSession, getAccount, setAccountName } from "@/lib/auth/session";

export type ProfileActionState = { ok: boolean; message: string; name?: string };

export async function saveNameAction(name: string): Promise<ProfileActionState> {
  const account = await getAccount();
  if (!account) return { ok: false, message: "Þú ert ekki skráð/ur inn lengur. Skráðu þig inn aftur." };
  const saved = setAccountName(account.id, String(name ?? ""));
  if (!saved) return { ok: false, message: "Sláðu inn nafn." };
  revalidatePath("/", "layout"); // the header shows the name
  return { ok: true, message: "Nafnið er vistað.", name: saved };
}

export async function signOutAction(): Promise<void> {
  await endSession();
  revalidatePath("/", "layout");
}
