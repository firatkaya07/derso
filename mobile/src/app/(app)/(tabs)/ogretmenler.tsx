import { EntityList } from "~/components/EntityList";
import { loadTeachers } from "~/data/schedule";

export default function TeachersTab() {
  return (
    <EntityList
      searchPlaceholder="Öğretmen ara"
      emptyDetail="Öğretmenleri web uygulamasından ekleyebilirsiniz."
      load={async (organizationId) =>
        (await loadTeachers(organizationId)).map((t) => ({
          id: t.id,
          title: t.name,
          detail: t.specialization,
          href: `/ogretmen/${t.id}`,
        }))
      }
    />
  );
}
