import ProgramBoard from "@/app/(dashboard)/program/ProgramBoard";
import Link from "next/link";

export default function V2ProgramPage() {
  return (
    <div className="space-y-3">
      <Link href="/v2" className="text-sm text-emerald-700 hover:underline">
        ← V2 ana sayfa
      </Link>
      <ProgramBoard edition="v2" />
    </div>
  );
}
