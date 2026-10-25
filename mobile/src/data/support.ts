import { Platform } from "react-native";
import { supabase } from "./supabase";

// Web'deki destek sohbetiyle (ContactFab) aynı tablo ve RPC'ler. Mobilde
// kullanıcı her zaman oturum açık olduğu için misafir token'ı kullanılmaz.

const SUPPORT_BUCKET = "support-attachments";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export interface SupportConversation {
  id: string;
  full_name: string;
  phone: string;
  status: "open" | "closed";
  last_message_at: string;
  created_at: string;
}

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender: "user" | "support";
  body: string;
  created_at: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
}

export async function listSupportConversations(): Promise<SupportConversation[]> {
  const { data, error } = await supabase.rpc("support_list_conversations", {
    p_guest_token: null,
  });
  if (error) throw new Error(error.message);
  return (data as SupportConversation[]) ?? [];
}

export async function listSupportMessages(conversationId: string): Promise<SupportMessage[]> {
  const { data, error } = await supabase.rpc("support_list_messages", {
    p_conversation_id: conversationId,
    p_guest_token: null,
  });
  if (error) throw new Error(error.message);
  return (data as SupportMessage[]) ?? [];
}

export async function startSupportConversation(input: {
  fullName: string;
  phone: string;
  message: string;
  email: string | null;
  organizationName: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("support_start_conversation", {
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_message: input.message,
    p_page: `mobil/${Platform.OS}`,
    p_email: input.email,
    p_organization_name: input.organizationName,
    p_guest_token: null,
  });
  if (error) throw new Error(error.message);
  return (data as { conversation_id: string }).conversation_id;
}

export async function sendSupportMessage(
  conversationId: string,
  body: string
): Promise<SupportMessage> {
  const { data, error } = await supabase.rpc("support_send_message", {
    p_conversation_id: conversationId,
    p_body: body,
    p_guest_token: null,
  });
  if (error) throw new Error(error.message);
  return data as SupportMessage;
}

export function attachmentUrl(path: string): string {
  return supabase.storage.from(SUPPORT_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function isImageMime(mime: string | null | undefined): boolean {
  return !!mime && IMAGE_TYPES.has(mime);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatSupportTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
