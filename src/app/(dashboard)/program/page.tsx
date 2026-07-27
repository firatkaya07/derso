"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { ClassGroup, ClassScheduleDay } from "@/lib/types";
import { DAY_NAMES } from "@/lib/types";

export default function ProgramListPage() {
  const supabase = createClient();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [scheduleDays, setScheduleDays] = useState<ClassScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [{ data: classData }, { data: scheduleData }] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("class_schedule_days").select("*"),
    ]);
    setClasses(classData || []);
    setScheduleDays(scheduleData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Ders Programi</h1>

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Henuz sinif eklenmemis.</p>
          <Link href="/siniflar" className="text-blue-600 hover:underline mt-2 text-sm inline-block">
            Once sinif ekleyin
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => {
            const days = scheduleDays
              .filter((d) => d.class_id === cls.id)
              .sort((a, b) => a.day_of_week - b.day_of_week);
            return (
              <Link
                key={cls.id}
                href={`/program/${cls.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow group"
              >
                <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                  {cls.name}
                </h3>
                {cls.description && (
                  <p className="text-sm text-gray-500 mt-1">{cls.description}</p>
                )}
                {days.length === 0 ? (
                  <p className="text-sm text-gray-400 mt-3 italic">
                    Ders gunu belirlenmemis
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {days.map((d) => (
                      <span
                        key={d.id}
                        className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded"
                      >
                        {DAY_NAMES[d.day_of_week]}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-blue-600 mt-3 font-medium">
                  Programi goruntule &rarr;
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
