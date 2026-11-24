import { notFound } from "next/navigation";
import { isValidRoomCode, normalizeRoomCode } from "@/shared/roomCode.ts";
import RoomClient from "@/components/RoomClient";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ create?: string }>;
}) {
  const { code: raw } = await params;
  const { create } = await searchParams;
  const code = normalizeRoomCode(raw);
  if (!isValidRoomCode(code)) notFound();
  return <RoomClient key={code} code={code} isCreating={create === "1"} />;
}
