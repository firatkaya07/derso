"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClassScheduleRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/program");
  }, [router]);
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-gray-500">Yönlendiriliyor...</div>
    </div>
  );
}
